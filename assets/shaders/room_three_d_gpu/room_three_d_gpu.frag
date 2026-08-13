const int kMaxCeilingSpots = 64;

layout(std140) uniform FrameInfo {
  mat4 view_projection;
  vec4 light_direction_intensity;
  vec4 shade_params;
  vec4 camera_position;
}
frame_info;

layout(std140) uniform LightInfo {
  vec4 room_light_params;
  vec4 room_light_style;
  vec4 daylight_params;
  vec4 central_light_anchor;
  vec4 ceiling_spots[64];
  vec4 light_debug_tuning_a;
  vec4 light_debug_tuning_b;
  vec4 light_debug_tuning_c;
  vec4 ceiling_spot_params[64];
  vec4 ceiling_spot_directions[64];
}
light_info;

layout(std140) uniform MaterialInfo {
  vec4 base_color;
  vec4 floor_color;
  vec4 wall_color;
  vec4 ceiling_color;
  vec4 material_params;
  vec4 pbr_flags;
  vec4 material_effect_flags;
  vec4 material_tuning;
  vec4 material_debug_tuning_a;
  vec4 material_debug_tuning_b;
  vec4 texture_style;
}
material_info;

uniform sampler2D base_color_texture;
uniform sampler2D normal_texture;
uniform sampler2D roughness_texture;
uniform sampler2D ao_texture;
uniform sampler2D metallic_texture;
uniform sampler2D opacity_texture;
uniform sampler2D emissive_texture;
uniform sampler2D height_texture;

in vec2 v_texture_coords;
in vec4 v_surface_color;
in vec3 v_world_position;
in vec3 v_world_normal;
in vec3 v_world_material_side_normal;
out vec4 frag_color;

const float kPi = 3.14159265359;

struct RoomTangentBasis {
  vec3 tangent;
  vec3 bitangent;
};

struct HeightReliefSamples {
  float center;
  float left;
  float right;
  float down;
  float up;
};

vec3 srgb_to_linear(vec3 value) {
  return pow(clamp(value, 0.0, 1.0), vec3(2.2));
}

vec3 linear_to_srgb(vec3 value) {
  return pow(max(value, vec3(0.0)), vec3(1.0 / 2.2));
}

vec3 neutral_tonemap(vec3 color) {
  const float start_compression = 0.76;
  const float toe = 0.08;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < toe ? x - (6.25 * x * x) : 0.04;
  color = max(color - offset, vec3(0.0));
  float peak = max(color.r, max(color.g, color.b));
  if (peak < start_compression) {
    return color;
  }
  float distance = 1.0 - start_compression;
  float new_peak =
      1.0 - (distance * distance) /
      max(peak + distance - start_compression, 0.0001);
  color *= new_peak / max(peak, 0.0001);
  float desaturation_weight =
      1.0 - (1.0 / (desaturation * (peak - new_peak) + 1.0));
  return mix(color, vec3(new_peak), desaturation_weight);
}

float height_relief_strength() {
  return clamp(material_info.material_effect_flags.w *
               material_info.material_debug_tuning_a.y, 0.0, 1.0);
}

float height_relief_balance_strength() {
  return clamp(material_info.texture_style.z *
               material_info.material_debug_tuning_a.y, 0.0, 1.0);
}

bool height_map_available() {
  return material_info.material_effect_flags.z > 0.5;
}

bool uses_directx_normal_map() {
  return material_info.texture_style.x > 0.5;
}

bool uses_glossiness_roughness_map() {
  return material_info.texture_style.y > 0.5;
}

float active_ceiling_spot_count() {
  return clamp(frame_info.shade_params.y, 0.0, float(kMaxCeilingSpots));
}

RoomTangentBasis tangent_basis_for(vec3 base_normal) {
  vec3 helper = abs(base_normal.z) < 0.92
      ? vec3(0.0, 0.0, 1.0)
      : vec3(0.0, 1.0, 0.0);
  vec3 tangent = normalize(cross(helper, base_normal));
  vec3 bitangent = normalize(cross(base_normal, tangent));
  return RoomTangentBasis(tangent, bitangent);
}

HeightReliefSamples sample_height_relief(vec2 uv, float relief_strength) {
  float sample_step = mix(1.0 / 1024.0, 1.0 / 512.0, relief_strength);
  return HeightReliefSamples(
      texture(height_texture, uv).r,
      texture(height_texture, uv - vec2(sample_step, 0.0)).r,
      texture(height_texture, uv + vec2(sample_step, 0.0)).r,
      texture(height_texture, uv - vec2(0.0, sample_step)).r,
      texture(height_texture, uv + vec2(0.0, sample_step)).r);
}

vec2 parallax_texture_coords(
    vec3 base_normal,
    RoomTangentBasis basis,
    vec3 view_direction,
    vec2 uv,
    float relief_strength) {
  float height_value = texture(height_texture, uv).r;
  float height_strength =
      mix(0.004, 0.022, relief_strength);
  vec3 tangent_view = vec3(dot(view_direction, basis.tangent),
                           dot(view_direction, basis.bitangent),
                           max(dot(view_direction, base_normal), 0.22));
  vec2 offset = (tangent_view.xy / tangent_view.z) *
                ((height_value - 0.5) * height_strength);
  return uv - offset;
}

vec3 height_relief_normal(
    vec3 shaded_normal,
    RoomTangentBasis basis,
    HeightReliefSamples height_samples,
    float relief_strength) {
  float normal_strength = clamp(material_info.material_tuning.x, 0.0, 1.0);
  float height_strength = mix(0.30, 0.92, relief_strength) *
                          mix(0.84, 1.18, normal_strength);

  vec3 relief = normalize(shaded_normal -
                          (basis.tangent *
                           (height_samples.right - height_samples.left) *
                           height_strength) -
                          (basis.bitangent *
                           (height_samples.up - height_samples.down) *
                           height_strength));
  return normalize(mix(shaded_normal, relief, mix(0.24, 0.52,
                                                 relief_strength)));
}

float height_relief_detail_light(
    HeightReliefSamples height_samples,
    float relief_strength) {
  const float detail_sample_gain = 4.0;
  float average =
      (height_samples.left + height_samples.right +
       height_samples.down + height_samples.up) * 0.25;
  vec2 gradient = vec2(height_samples.right - height_samples.left,
                       height_samples.up - height_samples.down) *
                  detail_sample_gain;
  float directional = dot(gradient, normalize(vec2(-0.58, 0.82)));
  float ridge = max(height_samples.center - average, 0.0) *
                detail_sample_gain;
  float cavity = max(average - height_samples.center, 0.0) *
                 detail_sample_gain;
  float edge = min(abs(gradient.x) + abs(gradient.y), 1.0);
  float detail =
      (directional * 0.44) + (ridge * 0.18) - (cavity * 0.26) +
      (edge * 0.025);
  detail *= mix(0.08, 0.20, relief_strength);
  return clamp(detail, -0.07, 0.085);
}

vec3 tangent_space_normal(
    vec3 base_normal,
    RoomTangentBasis basis,
    vec2 uv) {
  vec3 normal_sample = texture(normal_texture, uv).xyz * 2.0 - vec3(1.0);
  if (uses_directx_normal_map()) {
    normal_sample.y *= -1.0;
  }
  float normal_strength = clamp(material_info.material_tuning.x, 0.0, 1.0);
  normal_strength *= clamp(material_info.material_debug_tuning_a.x, 0.0, 2.0);
  normal_strength *= mix(1.0, 0.58, height_relief_balance_strength());
  normal_sample.xy *= normal_strength;
  return normalize(
      (basis.tangent * normal_sample.x) +
      (basis.bitangent * normal_sample.y) +
      (base_normal * max(normal_sample.z, 0.06)));
}

float wrapped_lambert(vec3 normal, vec3 light_direction, float wrap) {
  return clamp((dot(normal, light_direction) + wrap) / (1.0 + wrap),
               0.0, 1.0);
}

float ceiling_fill_light(vec3 normal) {
  vec3 top = vec3(0.0, 0.0, 1.0);
  vec3 ceiling_a = normalize(vec3(0.62, 0.18, 0.76));
  vec3 ceiling_b = normalize(vec3(-0.54, 0.42, 0.73));
  vec3 ceiling_c = normalize(vec3(0.12, -0.70, 0.70));
  float fill = max(dot(normal, top), 0.0) * 0.18;
  fill += wrapped_lambert(normal, ceiling_a, 0.42) * 0.30;
  fill += wrapped_lambert(normal, ceiling_b, 0.42) * 0.28;
  fill += wrapped_lambert(normal, ceiling_c, 0.42) * 0.24;
  return clamp(fill, 0.0, 1.0);
}

float central_diffuse_light(vec3 normal) {
  float wall_wrap = (1.0 - abs(normal.z)) * 0.50;
  float floor_wrap = max(normal.z, 0.0) * 0.18;
  float ceiling_bounce = wrapped_lambert(normal, vec3(0.0, 0.0, 1.0), 0.78) *
                         0.32;
  return clamp(wall_wrap + floor_wrap + ceiling_bounce, 0.0, 1.0);
}

bool ceiling_spot_is_diffuse(vec4 spot_params) {
  return mod(spot_params.w, 2.0) > 0.5;
}

float ceiling_spot_cone_weight(
    vec3 light_position,
    vec3 world_position,
    vec4 spot_params,
    vec4 spot_direction) {
  vec3 from_light = world_position - light_position;
  float distance_to_point = length(from_light);
  if (distance_to_point <= 0.001) {
    return 0.0;
  }
  if (ceiling_spot_is_diffuse(spot_params)) {
    return 1.0;
  }
  vec3 light_to_point = from_light / distance_to_point;
  vec3 direction = spot_direction.xyz;
  if (length(direction) <= 0.001) {
    direction = vec3(0.0, 0.0, -1.0);
  } else {
    direction = normalize(direction);
  }
  float angle_cos = dot(light_to_point, direction);
  float outer_cos = clamp(spot_params.z, -0.45, 0.98);
  float inner_cos = clamp(max(spot_params.y, outer_cos + 0.001), -0.44, 0.995);
  float bright_core = smoothstep(outer_cos, inner_cos, angle_cos);
  float soft_outer = smoothstep(outer_cos - 0.10, outer_cos, angle_cos);
  return clamp(bright_core + ((1.0 - bright_core) * soft_outer * 0.40),
               0.0, 1.0);
}

float ceiling_spot_light_at(
    vec3 normal,
    vec3 world_position,
    vec4 spot,
    vec4 spot_params,
    vec4 spot_direction) {
  if (spot.w <= 0.001) {
    return 0.0;
  }
  vec3 to_light = spot.xyz - world_position;
  float distance_to_light = length(to_light);
  if (distance_to_light <= 0.001) {
    return 0.0;
  }
  vec3 light_direction = to_light / distance_to_light;
  float cone = ceiling_spot_cone_weight(spot.xyz, world_position, spot_params,
                                        spot_direction);
  if (cone <= 0.001) {
    return 0.0;
  }
  float radius = max(spot.w, 0.35);
  float normalized_distance = distance_to_light / radius;
  float falloff =
      1.0 / (1.0 + normalized_distance * normalized_distance * 0.34);
  falloff *= 1.0 - smoothstep(radius * 2.1, radius * 4.4,
                              distance_to_light);
  float directed_facing = pow(wrapped_lambert(normal, light_direction, 0.02),
                              1.82);
  float diffuse_facing = wrapped_lambert(normal, light_direction, 0.24);
  float diffuse_mode = ceiling_spot_is_diffuse(spot_params) ? 1.0 : 0.0;
  float facing = mix(directed_facing, diffuse_facing, diffuse_mode);
  float source_intensity = clamp(spot_params.x, 0.05, 2.0);
  return facing * cone * falloff * source_intensity *
         mix(2.25, 1.55, diffuse_mode);
}

float ceiling_spot_light(vec3 normal, vec3 world_position) {
  float focused = 0.0;
  float active_count = active_ceiling_spot_count();
  for (int index = 0; index < kMaxCeilingSpots; index++) {
    if (float(index) >= active_count) {
      break;
    }
    vec4 spot = light_info.ceiling_spots[index];
    if (spot.w <= 0.001) {
      break;
    }
    focused += ceiling_spot_light_at(
        normal, world_position, spot,
        light_info.ceiling_spot_params[index],
        light_info.ceiling_spot_directions[index]) * 0.38;
  }
  return clamp(focused, 0.0, 1.0);
}

vec3 procedural_room_reflection(
    vec3 reflection_direction,
    vec3 albedo,
    float roughness,
    float metallic,
    float exterior_intensity,
    float directional_strength,
    float ceiling_light_strength,
    float interior_intensity,
    float wall_fill_tuning) {
  float up = clamp(reflection_direction.z * 0.5 + 0.5, 0.0, 1.0);
  float wall_weight = smoothstep(0.18, 0.82,
                                 1.0 - abs(reflection_direction.z));
  vec3 floor_env = srgb_to_linear(material_info.floor_color.rgb) *
                   mix(0.38, 0.58, interior_intensity);
  vec3 wall_env = srgb_to_linear(material_info.wall_color.rgb) *
                  mix(0.46, 0.68, interior_intensity);
  vec3 ceiling_env = srgb_to_linear(material_info.ceiling_color.rgb) *
                     mix(0.68, 0.92, ceiling_light_strength);
  vec3 env = mix(floor_env, ceiling_env, up);
  env = mix(env, wall_env, wall_weight * 0.58);

  vec3 exterior_color = vec3(1.0, 0.92, 0.76);
  vec3 ceiling_color = vec3(1.0, 0.96, 0.88);
  vec3 key_direction = normalize(-frame_info.light_direction_intensity.xyz);
  float key_glint = pow(max(dot(reflection_direction, key_direction), 0.0),
                        mix(28.0, 5.0, roughness));
  float ceiling_band = pow(max(reflection_direction.z, 0.0),
                           mix(16.0, 4.0, roughness));
  float room_band = pow(max(1.0 - abs(reflection_direction.z), 0.0),
                        mix(18.0, 6.0, roughness));
  env += exterior_color * key_glint *
         (directional_strength * 1.55 + exterior_intensity * 0.38);
  env += ceiling_color * ceiling_band * ceiling_light_strength * 0.06;
  env += albedo * room_band * interior_intensity * wall_fill_tuning *
         mix(0.035, 0.08, metallic);
  return env;
}

vec4 central_light_anchor() {
  return light_info.central_light_anchor;
}

float D_GGX(float n_dot_h, float roughness) {
  float alpha = max(roughness * roughness, 0.0016);
  float alpha_squared = alpha * alpha;
  float denominator =
      (n_dot_h * n_dot_h * (alpha_squared - 1.0)) + 1.0;
  return alpha_squared / max(kPi * denominator * denominator, 0.00001);
}

float G_SchlickGGX(float n_dot_x, float roughness) {
  float r = roughness + 1.0;
  float k = (r * r) * 0.125;
  return n_dot_x / max((n_dot_x * (1.0 - k)) + k, 0.00001);
}

float G_SmithSchlickGGX(float n_dot_v, float n_dot_l, float roughness) {
  return G_SchlickGGX(n_dot_v, roughness) *
         G_SchlickGGX(n_dot_l, roughness);
}

vec3 F_Schlick(float cos_theta, vec3 f0) {
  return f0 + (vec3(1.0) - f0) *
      pow(clamp(1.0 - cos_theta, 0.0, 1.0), 5.0);
}

vec3 F_SchlickRoughness(float cos_theta, vec3 f0, float roughness) {
  vec3 f90 = max(vec3(1.0 - roughness), f0);
  return f0 + (f90 - f0) *
      pow(clamp(1.0 - cos_theta, 0.0, 1.0), 5.0);
}

float luminance(vec3 value) {
  return dot(value, vec3(0.2126, 0.7152, 0.0722));
}

vec3 cook_torrance_specular_ggx(
    vec3 normal,
    vec3 view_direction,
    vec3 light_direction,
    vec3 f0,
    float roughness,
    float light_strength) {
  float n_dot_l = max(dot(normal, light_direction), 0.0);
  float n_dot_v = max(dot(normal, view_direction), 0.001);
  if (n_dot_l <= 0.001 || light_strength <= 0.001) {
    return vec3(0.0);
  }
  vec3 half_vector = light_direction + view_direction;
  float half_vector_length = length(half_vector);
  if (half_vector_length <= 0.001) {
    return vec3(0.0);
  }
  vec3 half_direction = half_vector / half_vector_length;
  float n_dot_h = max(dot(normal, half_direction), 0.0);
  float v_dot_h = max(dot(view_direction, half_direction), 0.0);
  float direct_roughness = clamp(roughness, 0.105, 1.0);
  float distribution = D_GGX(n_dot_h, direct_roughness);
  float geometry =
      G_SmithSchlickGGX(n_dot_v, n_dot_l, direct_roughness);
  vec3 fresnel = F_Schlick(v_dot_h, f0);
  vec3 brdf = (distribution * geometry * fresnel) /
      max(4.0 * n_dot_v * n_dot_l, 0.001);
  return min(brdf, vec3(8.0)) * n_dot_l * light_strength;
}

vec3 point_light_specular_ggx(
    vec3 normal,
    vec3 view_direction,
    vec3 world_position,
    vec4 light_anchor,
    vec4 light_params,
    vec4 light_direction_params,
    vec3 f0,
    float roughness,
    float light_strength,
    float radius_scale,
    float focus_power,
    float angular_cone_mix) {
  if (light_anchor.w <= 0.001 || light_strength <= 0.001) {
    return vec3(0.0);
  }
  vec3 to_light = light_anchor.xyz - world_position;
  float distance_to_light = length(to_light);
  if (distance_to_light <= 0.001) {
    return vec3(0.0);
  }
  vec3 light_direction = to_light / distance_to_light;
  float n_dot_l = max(dot(normal, light_direction), 0.0);
  if (n_dot_l <= 0.001) {
    return vec3(0.0);
  }
  float radius = max(light_anchor.w * radius_scale, 0.20);
  float horizontal_distance = length(world_position.xy - light_anchor.xy);
  float radial_cone =
      1.0 - smoothstep(radius * 0.12, radius, horizontal_distance);
  float angular_cone = ceiling_spot_cone_weight(light_anchor.xyz,
                                                world_position,
                                                light_params,
                                                light_direction_params);
  float cone = mix(radial_cone, angular_cone, angular_cone_mix);
  float falloff = 1.0 / (1.0 + distance_to_light * distance_to_light * 0.18);
  float source_intensity = clamp(light_params.x, 0.05, 2.0);
  float local_strength =
      pow(clamp(cone, 0.0, 1.0), focus_power) * falloff *
      light_strength * source_intensity;
  float area_light_roughness =
      clamp(sqrt((roughness * roughness) + 0.035), 0.18, 1.0);
  return cook_torrance_specular_ggx(
      normal, view_direction, light_direction, f0, area_light_roughness,
      local_strength);
}

vec3 ceiling_spot_specular_ggx(
    vec3 normal,
    vec3 view_direction,
    vec3 world_position,
    vec3 f0,
    float roughness,
    float ceiling_spot_strength) {
  if (ceiling_spot_strength <= 0.001) {
    return vec3(0.0);
  }
  vec3 specular = vec3(0.0);
  float active_count = active_ceiling_spot_count();
  for (int index = 0; index < kMaxCeilingSpots; index++) {
    if (float(index) >= active_count) {
      break;
    }
    vec4 spot = light_info.ceiling_spots[index];
    if (spot.w <= 0.001) {
      break;
    }
    specular += point_light_specular_ggx(
        normal, view_direction, world_position,
        spot,
        light_info.ceiling_spot_params[index],
        light_info.ceiling_spot_directions[index],
        f0, roughness, ceiling_spot_strength * 0.44, 0.72, 1.18, 1.0);
  }
  return specular;
}

vec3 central_light_specular_ggx(
    vec3 normal,
    vec3 view_direction,
    vec3 world_position,
    vec3 f0,
    float roughness,
    float central_light_strength) {
  if (central_light_strength <= 0.001) {
    return vec3(0.0);
  }
  return point_light_specular_ggx(
      normal, view_direction, world_position, central_light_anchor(),
      vec4(1.0, 0.0, 0.0, 1.0),
      vec4(0.0, 0.0, -1.0, 0.0),
      f0, roughness, central_light_strength * 1.12, 1.95, 0.68, 0.0);
}

float material_relief_light(
    vec3 normal,
    vec3 base_normal,
    RoomTangentBasis basis) {
  vec3 local_key_a = normalize((base_normal * 0.28) +
                               (basis.tangent * 0.64) +
                               (basis.bitangent * 0.70));
  vec3 local_key_b = normalize((base_normal * 0.24) -
                               (basis.tangent * 0.48) +
                               (basis.bitangent * 0.64));
  float key_a = wrapped_lambert(normal, local_key_a, 0.08);
  float key_b = wrapped_lambert(normal, local_key_b, 0.10);
  return (key_a * 0.62) + (key_b * 0.38);
}

void main() {
  float texture_mode = material_info.material_params.z;
  float use_texture = texture_mode > 0.5 ? 1.0 : 0.0;
  float two_sided_texture = texture_mode > 1.5 ? 1.0 : 0.0;
  float use_pbr = material_info.material_params.w;
  vec3 raw_geometry_normal = normalize(v_world_normal);
  vec3 material_side_normal = v_world_material_side_normal;
  if (length(material_side_normal) < 0.0001) {
    material_side_normal = raw_geometry_normal;
  } else {
    material_side_normal = normalize(material_side_normal);
  }
  vec3 view_direction = normalize(frame_info.camera_position.xyz -
                                  v_world_position);
  float front_material_side =
      dot(material_side_normal, view_direction) >= -0.0005 ? 1.0 : 0.0;
  float material_visible_side = max(front_material_side, two_sided_texture);
  float use_front_texture = use_texture * material_visible_side;
  float use_front_pbr = use_pbr * material_visible_side;
  vec3 material_geometry_normal = dot(raw_geometry_normal,
                                      material_side_normal) < 0.0
      ? -raw_geometry_normal
      : raw_geometry_normal;
  vec3 geometry_normal = front_material_side > 0.5
      ? material_geometry_normal
      : -material_geometry_normal;
  vec2 texture_uv = v_texture_coords;
  vec2 material_uv = texture_uv;
  float lighting_enabled = frame_info.shade_params.w;
  float pbr_preview_lighting =
      lighting_enabled <= 0.5 && use_front_pbr > 0.5 ? 1.0 : 0.0;
  float material_structure_shading = clamp(
      max(light_info.room_light_style.z, pbr_preview_lighting), 0.0, 1.0);
  bool uses_pbr_normal =
      material_structure_shading > 0.5 && use_front_pbr > 0.5 &&
      material_info.pbr_flags.x > 0.5;
  float active_height_relief_strength =
      height_relief_strength() * material_structure_shading;
  bool active_height_relief =
      use_front_pbr > 0.5 && height_map_available() &&
      active_height_relief_strength > 0.001;
  RoomTangentBasis geometry_basis =
      RoomTangentBasis(vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
  if (uses_pbr_normal || active_height_relief) {
    geometry_basis = tangent_basis_for(geometry_normal);
  }
  if (active_height_relief) {
    material_uv = parallax_texture_coords(
        geometry_normal, geometry_basis, view_direction, material_uv,
        active_height_relief_strength);
  }
  vec4 base_sample = use_front_texture > 0.5
      ? texture(base_color_texture, material_uv)
      : v_surface_color;
  vec3 albedo = srgb_to_linear(base_sample.rgb);
  float alpha = base_sample.a * v_surface_color.a;

  if (use_front_pbr > 0.5 && material_info.material_effect_flags.x > 0.5) {
    alpha *= texture(opacity_texture, material_uv).r;
    // flutter_gpu textures have no mipmaps, so the opacity (alpha) map
    // under-samples at distance and a translucent surface washes out to fully
    // see-through. Lift alpha back toward opaque with view distance so e.g.
    // frosted glass stays milky/consistent far away. Tunable: the near/far
    // distances (metres) and the far-distance opacity floor.
    float opacity_view_distance =
        length(frame_info.camera_position.xyz - v_world_position);
    float opacity_distance_fade = smoothstep(2.5, 9.0, opacity_view_distance);
    alpha = mix(alpha, max(alpha, 0.6), opacity_distance_fade);
  }

  float debug_view = frame_info.camera_position.w;
  if (debug_view > 0.5 && debug_view < 6.5) {
    vec3 debug_color = use_front_texture > 0.5
        ? texture(base_color_texture, texture_uv).rgb
        : v_surface_color.rgb;
    if (debug_view > 1.5 && debug_view < 2.5) {
      debug_color = use_front_pbr > 0.5 && material_info.pbr_flags.x > 0.5
          ? texture(normal_texture, texture_uv).rgb
          : vec3(0.0);
    } else if (debug_view > 2.5 && debug_view < 3.5) {
      float roughness_debug = 0.0;
      if (use_front_pbr > 0.5 && material_info.pbr_flags.y > 0.5) {
        roughness_debug = texture(roughness_texture, texture_uv).r;
        if (uses_glossiness_roughness_map()) {
          roughness_debug = 1.0 - roughness_debug;
        }
      }
      debug_color = vec3(roughness_debug);
    } else if (debug_view > 5.5 && debug_view < 6.5) {
      float metallic_debug =
          use_front_pbr > 0.5 && material_info.pbr_flags.w > 0.5
          ? texture(metallic_texture, texture_uv).r
          : 0.0;
      debug_color = vec3(clamp(metallic_debug, 0.0, 1.0));
    } else if (debug_view > 3.5 && debug_view < 4.5) {
      float ao_debug = use_front_pbr > 0.5 && material_info.pbr_flags.z > 0.5
          ? texture(ao_texture, texture_uv).r
          : 0.0;
      debug_color = vec3(ao_debug);
    } else if (debug_view > 4.5 && debug_view < 5.5) {
      float height_debug =
          use_front_pbr > 0.5 && height_map_available()
          ? texture(height_texture, texture_uv).r
          : 0.0;
      debug_color = vec3(height_debug);
    }
    frag_color = vec4(debug_color, alpha);
    return;
  }

  vec3 normal = geometry_normal;
  if (uses_pbr_normal) {
    normal = tangent_space_normal(normal, geometry_basis, material_uv);
  }
  float normal_relief_presence =
      uses_pbr_normal
      ? clamp(material_info.material_tuning.x *
              material_info.material_debug_tuning_a.x, 0.0, 1.0)
      : 0.0;
  float height_relief_presence =
      active_height_relief
      ? active_height_relief_strength
      : 0.0;
  float relief_presence =
      clamp(max(normal_relief_presence, height_relief_presence), 0.0, 1.0);
  float height_detail_light = 0.0;
  if (active_height_relief) {
    HeightReliefSamples height_samples =
        sample_height_relief(material_uv, active_height_relief_strength);
    normal = height_relief_normal(
        normal, geometry_basis, height_samples, active_height_relief_strength);
    height_detail_light = height_relief_detail_light(
        height_samples, active_height_relief_strength);
  }

  if (lighting_enabled <= 0.5 && pbr_preview_lighting < 0.5) {
    vec3 unlit_color = albedo;
    if (use_front_pbr > 0.5 && material_info.material_effect_flags.y > 0.5) {
      unlit_color += srgb_to_linear(texture(emissive_texture, material_uv).rgb) *
                     0.65;
    }
    frag_color = vec4(linear_to_srgb(unlit_color), alpha);
    return;
  }

  vec3 light_direction = normalize(-frame_info.light_direction_intensity.xyz);
  float ambient_tuning = clamp(light_info.light_debug_tuning_a.x, 0.4, 1.8);
  float ceiling_tuning = clamp(light_info.light_debug_tuning_a.y, 0.0, 2.0);
  float exterior_tuning = clamp(light_info.light_debug_tuning_a.z, 0.0, 1.8);
  float directional_tuning = clamp(light_info.light_debug_tuning_a.w, 0.0, 2.0);
  float exposure_tuning =
      pow(2.0, clamp(light_info.light_debug_tuning_b.x - 1.0, -1.0, 1.0));
  float contrast_tuning = clamp(light_info.light_debug_tuning_b.y, 0.6, 1.6);
  float wall_fill_tuning = clamp(light_info.light_debug_tuning_b.w, 0.0, 2.0);
  float specular_light_tuning =
      clamp(light_info.light_debug_tuning_c.x, 0.0, 2.0);
  float reflection_tuning =
      clamp(light_info.light_debug_tuning_c.y, 0.0, 2.0);
  float central_light_strength =
      clamp(light_info.room_light_params.x, 0.0, 1.8);
  float ceiling_spot_strength =
      clamp(light_info.room_light_params.y, 0.0, 1.8) * ceiling_tuning;
  float neutral_fill_strength =
      clamp(light_info.room_light_style.x, 0.0, 2.8);
  float interior_level_scale = clamp(light_info.room_light_style.y, 0.45, 1.65);
  float interior_level_weight = smoothstep(0.58, 1.42,
                                           interior_level_scale);
  central_light_strength = max(central_light_strength,
                               pbr_preview_lighting * 0.52);
  ceiling_spot_strength = max(ceiling_spot_strength,
                              pbr_preview_lighting * 0.46);
  neutral_fill_strength = max(neutral_fill_strength,
                              pbr_preview_lighting * 0.34);
  float exterior_intensity = clamp(light_info.room_light_params.z, 0.0, 1.0) *
                             clamp(light_info.room_light_params.w, 0.0, 1.0);
  exterior_intensity *= exterior_tuning;
  vec3 daylight_anchor = light_info.daylight_params.xyz;
  float daylight_radius = light_info.daylight_params.w;
  float daylight_distance = length(v_world_position - daylight_anchor);
  float daylight_near_window = daylight_radius > 0.001
      ? pow(1.0 - smoothstep(0.0, daylight_radius, daylight_distance), 1.35)
      : 0.0;
  float daylight_window_boost =
      daylight_near_window * exterior_intensity * 0.34;
  float directional_strength =
      frame_info.light_direction_intensity.w * exterior_intensity * 0.42;
  directional_strength += pbr_preview_lighting * 0.34;
  directional_strength *= directional_tuning;
  float n_dot_l = mix(
      max(dot(normal, light_direction), 0.0),
      wrapped_lambert(normal, light_direction, 0.22),
      0.32);
  float diffuse = n_dot_l * directional_strength;
  float ao = material_structure_shading > 0.5 && use_front_pbr > 0.5 &&
             material_info.pbr_flags.z > 0.5
      ? mix(1.0, texture(ao_texture, material_uv).r,
            clamp(0.82 * material_info.material_debug_tuning_a.z, 0.0, 1.0))
      : 1.0;
  float local_spot_light = ceiling_spot_strength > 0.001
      ? ceiling_spot_light(normal, v_world_position)
      : 0.0;
  float local_spot_strength =
      clamp(local_spot_light * ceiling_spot_strength, 0.0, 1.8);
  float local_spot_indirect_visibility =
      smoothstep(0.025, 0.18, local_spot_light);
  float local_ceiling_spot_strength =
      ceiling_spot_strength * local_spot_indirect_visibility;
  float local_central_light_strength = central_light_strength;
  float local_ceiling_light_strength =
      max(local_ceiling_spot_strength, local_central_light_strength * 0.38);
  float local_interior_intensity = max(
      neutral_fill_strength,
      max(local_central_light_strength,
          local_ceiling_spot_strength * 0.68));
  float exterior_ambient =
      frame_info.shade_params.x * exterior_intensity *
      mix(0.42, 1.0, exterior_intensity);
  float artificial_ambient =
      0.014 + (neutral_fill_strength * 0.30) +
      (local_central_light_strength * 0.080) +
      (local_ceiling_spot_strength * 0.006) +
      (local_spot_strength * 0.026);
  float ambient = mix(
      max(exterior_ambient + (daylight_window_boost * 0.12),
          artificial_ambient),
      0.42,
      pbr_preview_lighting);
  ambient *= ambient_tuning;
  ambient *= clamp(material_info.material_debug_tuning_b.w, 0.4, 1.4);
  if (height_relief_presence > 0.0) {
    ambient *= mix(1.0, 0.76, height_relief_presence);
  }
  float central_fill = central_diffuse_light(normal) *
                       central_light_strength * 0.46;
  float ceiling_fill = ceiling_fill_light(normal) *
                       local_ceiling_spot_strength * 0.012;
  float ceiling_spot_fill = local_spot_strength *
                            1.08;
  float broad_artificial_fill =
      (neutral_fill_strength * 0.58) +
      (local_central_light_strength * 0.26) +
      (local_spot_strength * 0.18) +
      (local_ceiling_spot_strength * 0.012);
  float vertical_fill = (1.0 - abs(normal.z)) * broad_artificial_fill * 0.08 *
                        wall_fill_tuning;
  float grazing_fill =
      pow(1.0 - abs(normal.z), 2.0) * broad_artificial_fill * 0.045 *
      wall_fill_tuning;
  float available_light = clamp(
      exterior_intensity +
      (neutral_fill_strength * 0.62) +
      (local_central_light_strength * 0.38) +
      (local_spot_strength * 1.00) +
      (local_ceiling_spot_strength * 0.012) +
      pbr_preview_lighting,
      0.0,
      1.0);
  float artificial_available = clamp(
      (neutral_fill_strength * 0.62) +
      (local_central_light_strength * 0.38) +
      (local_spot_strength * 1.00) +
      (local_ceiling_spot_strength * 0.012),
      0.0,
      1.0);
  float level_floor_scale =
      mix(1.0,
          mix(0.66, 1.08, interior_level_weight),
          smoothstep(0.04, 0.32, artificial_available));
  float texture_floor = use_front_texture > 0.5
      ? mix(0.018, 0.36, available_light)
      : mix(0.012, 0.12, available_light);
  texture_floor *= level_floor_scale;
  texture_floor = mix(texture_floor, 0.34, pbr_preview_lighting);
  float light_floor = mix(0.012, 0.095, available_light) *
                      level_floor_scale;
  float light = clamp((ambient * mix(1.0, ao, 0.58)) +
                          diffuse + daylight_window_boost + central_fill +
                          ceiling_fill + ceiling_spot_fill + vertical_fill +
                          grazing_fill,
                      light_floor, 1.28);
  light = max(light, texture_floor);
  if (relief_presence > 0.0) {
    float flat_relief_light =
        material_relief_light(geometry_normal, geometry_normal,
                              geometry_basis);
    float shaded_relief_light =
        material_relief_light(normal, geometry_normal, geometry_basis);
    float relief_contrast =
        (shaded_relief_light - flat_relief_light) *
        mix(0.10, 0.28, relief_presence) *
        max(local_interior_intensity, 0.42) *
        clamp(material_info.material_debug_tuning_a.w, 0.0, 2.0);
    light = clamp(light + relief_contrast, 0.14, 1.28);
  }
  if (active_height_relief) {
    float detail_weight = 0.24;
    float detail_floor =
        max(light_floor, texture_floor - mix(0.07, 0.14,
                                             active_height_relief_strength));
    float balanced_height_detail_light = height_detail_light < 0.0
        ? height_detail_light
        : height_detail_light * 0.55;
    light = clamp(light +
                  (balanced_height_detail_light * detail_weight *
                   clamp(material_info.material_debug_tuning_b.x, 0.0, 2.0)),
                  detail_floor, 1.24);
  }
  vec3 color = albedo * light;
  float pbr_debug_specular = 0.0;
  vec3 pbr_debug_reflection = vec3(0.0);

  if (use_front_pbr > 0.5) {
    float roughness = 0.78;
    if (material_info.pbr_flags.y > 0.5) {
      roughness = texture(roughness_texture, material_uv).r;
      if (uses_glossiness_roughness_map()) {
        roughness = 1.0 - roughness;
      }
    }
    roughness += material_info.material_tuning.y +
                 material_info.material_debug_tuning_b.y;
    roughness = clamp(roughness, 0.04, 1.0);
    float metallic = material_info.pbr_flags.w > 0.5
        ? texture(metallic_texture, material_uv).r
        : material_info.material_tuning.z;
    metallic = clamp(metallic, 0.0, 1.0);

    float n_dot_v = max(dot(normal, view_direction), 0.001);
    float gloss = pow(1.0 - roughness, 2.2);
    float glossy_dielectric =
        (1.0 - metallic) * smoothstep(0.08, 0.70, gloss);
    float real_light_gloss_gate = 1.0 - pbr_preview_lighting;
    vec3 reflection_direction = normalize(reflect(-view_direction, normal));
    float metal_visibility = smoothstep(0.35, 1.0, metallic);
    float albedo_luma = luminance(albedo);
    vec3 material_preview_color = srgb_to_linear(material_info.base_color.rgb);
    float preview_luma = luminance(material_preview_color);
    float dark_metal_lift =
        metal_visibility * (1.0 - smoothstep(0.22, 0.58, albedo_luma));
    float silver_floor_luma = clamp(max(preview_luma * 0.68, 0.46),
                                    0.0, 0.72);
    float albedo_chroma = max(albedo.r, max(albedo.g, albedo.b)) -
                          min(albedo.r, min(albedo.g, albedo.b));
    float colored_metal = smoothstep(0.045, 0.16, albedo_chroma) *
                          smoothstep(0.035, 0.12, albedo_luma);
    vec3 hue_preserving_floor =
        clamp((albedo / max(albedo_luma, 0.001)) * silver_floor_luma,
              vec3(0.0),
              vec3(1.0));
    vec3 metal_floor_color =
        mix(vec3(silver_floor_luma), hue_preserving_floor, colored_metal);
    vec3 metal_body_color =
        mix(albedo, max(albedo, metal_floor_color), dark_metal_lift);
    vec3 dielectric_f0 = vec3(0.04);
    vec3 f0 = mix(dielectric_f0, metal_body_color, metallic);
    vec3 view_fresnel = F_SchlickRoughness(n_dot_v, f0, roughness);
    vec3 diffuse_energy = (vec3(1.0) - view_fresnel) * (1.0 - metallic);
    diffuse_energy = mix(diffuse_energy,
                         max(diffuse_energy, vec3(0.86 * (1.0 - metallic))),
                         glossy_dielectric * real_light_gloss_gate * 0.28);
    vec3 directional_specular = cook_torrance_specular_ggx(
        normal, view_direction, light_direction, f0, roughness,
        directional_strength * 1.20);
    vec3 artificial_specular =
        central_light_specular_ggx(
            normal, view_direction, v_world_position, f0, roughness,
            central_light_strength) +
        ceiling_spot_specular_ggx(
            normal, view_direction, v_world_position, f0, roughness,
            ceiling_spot_strength);
    float specular_tuning =
        material_info.material_tuning.w *
        clamp(material_info.material_debug_tuning_b.z, 0.0, 2.0) *
        specular_light_tuning *
        mix(0.92, 1.10, glossy_dielectric);
    vec3 direct_specular =
        (directional_specular + artificial_specular) * specular_tuning;

    float clearcoat_amount =
        (1.0 - metallic) * smoothstep(0.16, 0.82, gloss) * 0.55;
    float clearcoat_roughness =
        clamp(mix(0.055, 0.32, roughness), 0.055, 0.38);
    vec3 clearcoat_f0 = vec3(0.04);
    vec3 directional_clearcoat = cook_torrance_specular_ggx(
        normal, view_direction, light_direction, clearcoat_f0,
        clearcoat_roughness, directional_strength * 0.78);
    vec3 artificial_clearcoat =
        central_light_specular_ggx(
            normal, view_direction, v_world_position, clearcoat_f0,
            clearcoat_roughness, central_light_strength) +
        ceiling_spot_specular_ggx(
            normal, view_direction, v_world_position, clearcoat_f0,
            clearcoat_roughness, ceiling_spot_strength);
    vec3 clearcoat_specular =
        (directional_clearcoat + artificial_clearcoat) *
        clearcoat_amount * specular_tuning * 0.44;

    vec3 ibl_env = procedural_room_reflection(
        reflection_direction,
        metal_body_color,
        roughness,
        metallic,
        exterior_intensity,
        directional_strength,
        local_ceiling_light_strength,
        local_interior_intensity,
        wall_fill_tuning);
    float silver_visibility =
        metal_visibility * smoothstep(0.08, 0.52,
                                      luminance(metal_body_color));
    float environment_reflection_tuning =
        pow(clamp(reflection_tuning * mix(0.50, 1.18, metal_visibility),
                  0.0, 1.0),
            1.35) *
        mix(0.035, 0.18, gloss);
    float reflection_activity = max(exterior_intensity,
                                    max(local_interior_intensity * 0.50,
                                        0.08));
    float ceiling_reflection_alignment =
        pow(max(reflection_direction.z, 0.0), mix(2.8, 0.92, gloss));
    float floor_reflection_alignment =
        pow(max(-reflection_direction.z, 0.0), mix(2.8, 0.92, gloss));
    float wall_reflection_alignment =
        pow(max(1.0 - abs(reflection_direction.z), 0.0),
            mix(2.2, 0.82, gloss));
    float room_reflection_alignment =
        max(max(ceiling_reflection_alignment, floor_reflection_alignment),
            wall_reflection_alignment * 0.74);
    float dielectric_reflection =
        (1.0 - metallic) * mix(0.006, 0.030, gloss) *
        reflection_activity;
    dielectric_reflection +=
        glossy_dielectric * real_light_gloss_gate * mix(0.010, 0.052, gloss) *
        max(reflection_activity,
            max(local_ceiling_light_strength * 0.50,
                local_central_light_strength * 0.36));
    float metal_reflection = metallic * mix(0.18, 0.98, gloss);
    vec3 ibl_reflection =
        ibl_env *
        ((view_fresnel * metal_reflection) + vec3(dielectric_reflection)) *
        environment_reflection_tuning;
    vec3 glossy_area_sheen =
        vec3(1.0, 0.965, 0.90) *
        glossy_dielectric *
        real_light_gloss_gate *
        environment_reflection_tuning *
        specular_tuning *
        ((room_reflection_alignment *
          (0.015 + local_ceiling_light_strength * 0.050 +
           local_central_light_strength * 0.040 +
           exterior_intensity * 0.034)) +
         (local_spot_strength * 0.018) +
         (daylight_window_boost * 0.025));
    float broad_gloss_light =
        (central_diffuse_light(normal) * local_central_light_strength * 0.34) +
        (ceiling_fill_light(normal) * local_ceiling_spot_strength * 0.18) +
        (wrapped_lambert(normal, light_direction, 0.62) *
         directional_strength * 0.16) +
        (daylight_window_boost * 0.12);
    float silver_body_light =
        max(ambient, 0.42) +
        (broad_gloss_light * 0.46) +
        (local_spot_strength * 0.06) +
        (directional_strength * 0.10);
    vec3 broad_gloss_sheen =
        vec3(1.0, 0.965, 0.90) *
        glossy_dielectric *
        real_light_gloss_gate *
        specular_tuning *
        broad_gloss_light *
        mix(0.045, 0.190, gloss) *
        mix(0.72, 1.08, room_reflection_alignment);
    color = mix(albedo, metal_body_color, metal_visibility * 0.45) *
            light *
            diffuse_energy;
    color += metal_body_color * metallic * ambient * mix(0.10, 0.28,
                                                         metal_visibility);
    color += metal_body_color *
             silver_visibility *
             silver_body_light *
             mix(0.72, 1.02, gloss) *
             mix(0.84, 1.16, room_reflection_alignment);
    color += direct_specular;
    color += clearcoat_specular;
    color += ibl_reflection;
    color += glossy_area_sheen;
    color += broad_gloss_sheen;
    pbr_debug_specular =
        clamp(luminance(direct_specular + clearcoat_specular) * 2.4,
              0.0, 1.0);
    pbr_debug_reflection =
        clamp((ibl_reflection + glossy_area_sheen + broad_gloss_sheen) * 3.0,
              0.0, 1.0);

    if (material_info.material_effect_flags.y > 0.5) {
      color += srgb_to_linear(texture(emissive_texture, material_uv).rgb) *
               0.65;
    }
  } else {
    float rim = pow(1.0 - abs(dot(normal, light_direction)), 2.0);
    color += srgb_to_linear(material_info.base_color.rgb) * rim * 0.018;
  }

  if (debug_view > 6.5 && debug_view < 7.5) {
    frag_color = vec4(vec3(pbr_debug_specular), alpha);
    return;
  }
  if (debug_view > 7.5 && debug_view < 8.5) {
    frag_color = vec4(linear_to_srgb(pbr_debug_reflection), alpha);
    return;
  }

  color *= exposure_tuning;
  color = mix(vec3(0.18), color, contrast_tuning);
  color = neutral_tonemap(color);
  frag_color = vec4(linear_to_srgb(color), alpha);
}
