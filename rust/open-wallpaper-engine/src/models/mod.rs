mod mdl;

struct Vertex {
    position: [f32; 3],
    tex_coords: [f32; 2],
    blend_indices: [u32; 4],
    weights: [f32; 4],
}

enum PlayMode {
    Loop,
    Mirror,
    Single,
}

struct WPPuppet {}

struct WPMdl {
    mdlv: i32,
    mdls: i32,
    mdla: i32,

    vertices: Vec<Vertex>,
    indices: Vec<[u16; 3]>,
}
