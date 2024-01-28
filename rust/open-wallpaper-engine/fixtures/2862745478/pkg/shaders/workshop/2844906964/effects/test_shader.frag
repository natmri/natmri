#include "common.h"
#include "common_blending.h"


uniform vec3 u_Color; // {"default":"1 0 0","material":"Color","type":"color"}

// [COMBO] {"material":"ui_editor_properties_blend_mode","combo":"BLENDMODE","type":"imageblending","default":0}

uniform float g_Time;
uniform sampler2D g_Texture0; // { "material": "mask", "label": "ui_editor_properties_framebuffer", "hidden": true }
// uniform float g_AudioSpectrum16Right[16];
// uniform float g_AudioSpectrum16Left[16];
uniform vec2 g_PointerPosition;

uniform float u_Brightness; // {"material":"Brightness","default":0.15,"range":[0,1]}
uniform float u_Speed; // {"material":"Speed","default":0.5,"range":[0,1]}

uniform float g_AudioSpectrum64Right[64];
uniform float g_AudioSpectrum64Left[64];

uniform float u_ReduceValue; // {"material":"Suppression","default":1,"range":[0.5,10]}

uniform float u_MinFreqRange; // {"material":"Min Freq Range","int":true,"default":0,"range":[0,16]}
uniform float u_MaxFreqRange; // {"material":"Max Freq Range","int":true,"default":16,"range":[0,16]}

uniform float u_Radius; // {"material":"Radius","default":0.2,"range":[0,1]}
uniform vec2 u_FixedSize; // {"default":"1 0.59","material":"Fixed Size","position":true}

uniform vec2 g_TexelSize;

varying vec2 v_TexCoord;

#define BEATMOVE 1

const float FREQ_RANGE = 128.0;
const float PI = 3.1415;
const float RADIUS = 0.2;
const float BRIGHTNESS = 0.15;
const float SPEED = 0.5;

float luma(vec3 color) {
	return dot(color, vec3(0.299, 0.587, 0.5));
}

float getFrequency(float x) {
	float left = 0.1;
	float right = 0.1;

	for (int i = u_MinFreqRange; i < u_MaxFreqRange; i++) {
		left += g_AudioSpectrum64Left[i];
		right += g_AudioSpectrum64Right[i];
	}

	float volume = (left + right) * 0.5;

	return abs(volume / u_ReduceValue);
	// return abs(sin(g_Time));
	// return texSample2D(g_Texture0, vec2(floor(((left + right) * 0.5) * FREQ_RANGE + 1.0) / FREQ_RANGE, 0.25)).x + 0.06;
}

float getFrequency_smooth(float x) {
	float index = floor(x * FREQ_RANGE) / FREQ_RANGE;
	float next = floor(x * FREQ_RANGE + 1.0) / FREQ_RANGE;
	return mix(getFrequency(index), getFrequency(next), smoothstep(0.0, 1.0, frac(x * FREQ_RANGE)));
}

float getFrequency_blend(float x) {
	return mix(getFrequency(x), getFrequency_smooth(x), 0.5);
}

vec3 circleIllumination(vec2 fragment, float radius) {
	float distance = length(fragment);
	float ring = 1.0 / abs(distance - radius - (getFrequency_smooth(0.0) / 4.50));

	// float brightness = distance < radius ? u_Brightness * 0.3 : u_Brightness;

	vec3 color = CAST3(0.0);

	float angle = atan2(fragment.x, fragment.y);
	// color += hsv2rgb(vec3((angle + g_Time * 2.5) / (M_PI * 2.0), 1.0, 1.0)) * ring * u_Brightness;
	color += u_Color * ring * u_Brightness;

	float frequency = max(getFrequency_blend(abs(angle / M_PI)) - 0.02, 0.0);
	color *= frequency;

	// Black halo
	// color *= smoothstep(radius * 0.5, radius, distance);

	return color;
}

vec3 doLine(vec2 fragment, float radius, float x) {
	vec3 col = hsv2rgb(vec3(x * 0.23 + g_Time * 0.12, 1.0, 1.0));

	float freq = abs(fragment.x * 0.5);

	col *= (1.0 / abs(fragment.y)) * u_Brightness * getFrequency(freq);
	col = col * smoothstep(radius, radius * 1.8, abs(fragment.x));

	return col;
}

void main() {
	vec4 albedo = texSample2D(g_Texture0, v_TexCoord.xy);
	vec2 fragPos = v_TexCoord;
	fragPos = (fragPos - 0.5) * 2.0;
	fragPos.x *= u_FixedSize.x / u_FixedSize.y;

	vec3 color = vec3(0.0, 0.0, 0.0);
	color += circleIllumination(fragPos, u_Radius);

	color += max(luma(color) - 1.0, 0.0);
	albedo.rgb = ApplyBlending(BLENDMODE, albedo.rgb, color, 1.0);

	gl_FragColor = vec4(max(0, albedo.rgb), albedo.a);
}
