const int kMaxCeilingSpots = 64;

layout(std140) uniform FrameInfo {
  mat4 view_projection;
  vec4 light_direction_intensity;
  vec4 shade_params;
  vec4 camera_position;
}
frame_info;

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

in vec3 position;
in vec3 normal;
in vec3 material_side_normal;
in vec2 uv;

out vec2 v_texture_coords;
out vec4 v_surface_color;
out vec3 v_world_position;
out vec3 v_world_normal;
out vec3 v_world_material_side_normal;

void main() {
  vec3 resolved_normal = normal;
  if (length(resolved_normal) < 0.0001) {
    resolved_normal = vec3(0.0, 0.0, 1.0);
  }
  resolved_normal = normalize(resolved_normal);

  vec3 color = material_info.wall_color.rgb;
  if (abs(resolved_normal.z) > 0.72) {
    color = resolved_normal.z < -0.35
        ? material_info.ceiling_color.rgb
        : position.z <= 0.35
        ? material_info.floor_color.rgb
        : material_info.wall_color.rgb;
  } else {
    float orientation =
        dot(normalize(resolved_normal.xy), normalize(vec2(0.72, 0.38)));
    float orientation_tint = mix(0.86, 1.10, orientation * 0.5 + 0.5);
    float height_tint = mix(0.92, 1.08, clamp(position.z / 2.8, 0.0, 1.0));
    float surface_breakup = sin((uv.x + uv.y) * 2.35) * 0.012;
    color *= orientation_tint * height_tint + surface_breakup;
  }

  v_texture_coords = vec2(
      uv.x / max(material_info.material_params.x, 0.0001),
      uv.y / max(material_info.material_params.y, 0.0001));
  v_surface_color = vec4(clamp(color, 0.0, 1.0), material_info.base_color.a);
  v_world_position = position;
  v_world_normal = resolved_normal;
  v_world_material_side_normal = material_side_normal;
  gl_Position = frame_info.view_projection * vec4(position, 1.0);
}
