#![feature(fs_try_exists)]

use std::{
    collections::HashMap,
    fs::{self},
    path::{Path, PathBuf},
};

use derive_builder::Builder;
use serde::{Deserialize, Serialize};

mod app;
mod models;
mod parser;

#[derive(Debug, Serialize, Deserialize)]
struct SceneCamera {
    center: String,
    eye: String,
    up: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OrthogonalProjection {
    height: u32,
    width: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct SceneGeneral {
    ambientcolor: String,
    bloom: bool,
    bloomhdrfeather: f32,
    bloomhdriterations: f32,
    bloomhdrscatter: f32,
    bloomhdrstrength: f32,
    bloomhdrthreshold: f32,
    bloomstrength: f32,
    bloomthreshold: f32,
    camerafade: bool,
    cameraparallax: bool,
    cameraparallaxamount: f32,
    cameraparallaxdelay: f32,
    cameraparallaxmouseinfluence: f32,
    camerapreview: bool,
    camerashake: bool,
    camerashakeamplitude: f32,
    camerashakeroughness: f32,
    camerashakespeed: f32,
    clearcolor: String,
    clearenabled: bool,
    farz: f32,
    fov: f32,
    hdr: bool,
    nearz: f32,
    skylightcolor: String,
    zoom: f32,
    orthogonalprojection: OrthogonalProjection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SceneEffectCombos {}

#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
struct SceneEffectShaderValue {
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    bounds: Option<String>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    friction: Option<String>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    speed: Option<f32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    strength: Option<f32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    phase: Option<f32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    power: Option<f32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    ratio: Option<f32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    scale: Option<SceneEffectShaderValueScale>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    scrolldirection: Option<f32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    speeduv: Option<f32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    noiseamount: Option<f32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    rough: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
enum SceneEffectShaderValueColor {
    #[serde(untagged)]
    String(String),
    #[serde(untagged)]
    HashMap(HashMap<String, String>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
enum SceneEffectShaderValueScale {
    #[serde(untagged)]
    String(String),
    #[serde(untagged)]
    F32(f32),
}

#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
struct SceneEffectPass {
    id: u32,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    textures: Option<Vec<Option<String>>>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    combos: Option<SceneEffectCombos>,
    constantshadervalues: SceneEffectShaderValue,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SceneEffect {
    file: String,
    id: u32,
    name: String,
    visible: bool,
    passes: Vec<SceneEffectPass>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SceneAnimationLayer {
    additive: bool,
    animation: u32,
    blend: f32,
    id: u32,
    name: String,
    rate: f32,
    visible: bool,
}

#[derive(Debug, Builder, Serialize, Deserialize)]
struct SceneObject {
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    alignment: Option<String>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    alpha: Option<f32>,
    angles: String,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    brightness: Option<f32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    color: Option<SceneEffectShaderValueColor>,
    #[builder(default, setter(strip_option))]
    #[serde(alias = "colorBlendMode", skip_serializing_if = "Option::is_none")]
    color_blend_mode: Option<u32>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    copybackground: Option<bool>,
    id: u32,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    image: Option<String>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    ledsource: Option<bool>,
    locktransforms: bool,
    name: String,
    origin: String,
    #[serde(alias = "parallaxDepth")]
    parallax_depth: String,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    perspective: Option<bool>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    scale: Option<SceneEffectShaderValueScale>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<String>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    solid: Option<bool>,
    visible: bool,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    effects: Option<Vec<SceneEffect>>,
    #[builder(default, setter(strip_option))]
    #[serde(skip_serializing_if = "Option::is_none")]
    animationlayers: Option<Vec<SceneAnimationLayer>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Scene {
    camera: SceneCamera,
    general: SceneGeneral,
    objects: Vec<SceneObject>,
    version: u8,
}

#[derive(Debug, Default, Serialize, Deserialize)]
enum ProjectType {
    Scene,
    #[default]
    Unknown,
}

#[derive(Debug, Serialize, Deserialize)]
struct Project {
    contentrating: String,
    description: String,
    file: String,
    general: General,
    preview: String,
    tags: Vec<String>,
    title: String,
    r#type: ProjectType,
    version: u8,
    visibility: String,
    workshopurl: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct General {
    properties: HashMap<String, Property>,
    supportsaudioprocessing: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct Property {
    index: i32,
    order: i32,
    text: String,
    r#type: String,
    value: String,
}

#[derive(Debug)]
struct WEProject {
    project: Project,
    pkg_dir: PathBuf,
    scene_id: String,
}

impl WEProject {
    pub fn new<P>(source: P) -> Self
    where
        P: AsRef<Path>,
    {
        let source_path = source.as_ref().to_path_buf();
        let pkg_dir = source_path.parent().unwrap().to_owned();
        let scene_id = source_path
            .parent()
            .unwrap()
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();
        fs::try_exists(source.as_ref()).expect("Failed to open file");
        let project_str = fs::read_to_string(source.as_ref()).unwrap();
        let project: Project = serde_json::from_str(&project_str).unwrap();

        Self {
            project,
            scene_id,
            pkg_dir,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_we_project() {
        let project = WEProject::new("./fixtures/2862745478/project.json");

        println!("{:#?}", project);
    }

    #[test]
    fn test_we_scene() {
        let scene_path = "./fixtures/2862745478/pkg/scene.json";
        let scene_str = fs::read_to_string(scene_path).unwrap();
        let scene: Scene = serde_json::from_str(&scene_str).unwrap();

        println!("{:#?}", scene);
    }
}
