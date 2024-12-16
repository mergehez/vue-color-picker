<script setup lang="ts">
import {ref, onMounted, computed, watch, reactive} from 'vue'
import '../style.css';
import {twMerge} from "tailwind-merge";

type RGB = { r: number; g: number; b: number }
type HSL = { h: number; s: number; l: number }
type HEX = string
type ColorClasses = {
    surface?: string;
    canvas?: string;
    canvasCircle?: string;
    opacityWrapper?: string;
    input?: string;
    paletteRemove?: string;
    paletteAdd?: string;
};

const modelValue = defineModel<string>({
    default: '#FF0000',
})
const props = withDefaults(defineProps<{
    palette?: boolean,
    eyeDropper?: boolean,
    classes?: ColorClasses,
}>(), {
    palette: true,
    eyeDropper: true,
    classes: () => ({
        surface: 'bg-gray-50 dark:bg-black dark:text-white',
        canvas: 'outline-gray-200 dark:outline-gray-800',
        canvasCircle: 'dark:border-white shadow-black',
        opacityWrapper: 'opacity-wrapper',
        input: 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-black text-gray-900 dark:text-white',
        paletteRemove: 'bg-red-200 dark:bg-red-700',
        paletteAdd: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900',
    } satisfies ColorClasses),
})

const canvas = ref<HTMLCanvasElement>()
const ctx = ref<CanvasRenderingContext2D>()
const _alpha = ref(100)
const opacity = computed<number, string | number>({
    get: () => _alpha.value,
    set: (newAlpha: string | number) => _alpha.value = Math.max(0, Math.min(100, parseInt(newAlpha as string)))
})
const isPicking = ref(false)
const pickXY = ref({x: 0, y: 0})

const hsl = reactive<HSL>({
    h: 0,
    s: 100,
    l: 100,
})

const rgb = computed({
    get: () => colorUtils.hslToRgb(hsl),
    set: (newRgb: RGB) => updateHslRefs(colorUtils.rgbToHexHsl(newRgb))
})

const hexColor = computed(() => colorUtils.rgbToHex(rgb.value))
const hexWithoutAlpha = computed(() => hexColor.value.slice(0, 7))

const setInitialColor = () => {
    if (!modelValue.value)
        return;

    let hex = modelValue.value;
    if (hex.startsWith('rgba')) {
        const rgba = hex.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(\.\d+)?)\)/);
        if (rgba) {
            opacity.value = parseFloat(rgba[4]) * 100
            rgb.value = {r: parseInt(rgba[1]), g: parseInt(rgba[2]), b: parseInt(rgba[3])}
        }
        return
    } else {
        onUserHexInput(hex, true)
    }

    drawColorCanvas()
}

const drawColorCanvas = () => {
    if (!ctx.value || !canvas.value) return

    const width = canvas.value.width
    const height = canvas.value.height
    const imageData = ctx.value.createImageData(width, height)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const s = x / width * 100
            const b = 100 - (y / height * 100)
            const rgb = colorUtils.hslToRgb({h: hsl.h, s: s, l: b})
            const index = (y * width + x) * 4
            imageData.data[index] = rgb.r
            imageData.data[index + 1] = rgb.g
            imageData.data[index + 2] = rgb.b
            imageData.data[index + 3] = 255
        }
    }

    ctx.value.putImageData(imageData, 0, 0)
}

const startPicking = (event: MouseEvent) => {
    isPicking.value = true
    pick(event)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopPicking)
}

const stopPicking = (event: MouseEvent) => {
    if (event.type === 'mouseup') {
        isPicking.value = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', stopPicking)
    }
}

const handleMouseMove = (event: MouseEvent) => {
    if (isPicking.value) {
        pick(event)
    }
}

const pick = (event: MouseEvent) => {
    if (!isPicking.value || !canvas.value) return

    const rect = canvas.value.getBoundingClientRect()
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height))
    hsl.s = (x / rect.width) * 100
    hsl.l = 100 - (y / rect.height) * 100
    pickXY.value = {x: hsl.s, y: 100 - hsl.l}
    debouncedUpdateColor()
}

const updateColor = () => {
    requestAnimationFrame(() => {
        modelValue.value = hexColor.value
    })
}
const debouncedUpdateColor = (function () {
    let timer: any;
    return function () {
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(() => updateColor(), 10);
    }
})();


const colorUtils = {
    hslToRgb: (hsl: HSL): RGB => {
        const h = hsl.h / 60
        const s = hsl.s / 100
        const b = hsl.l / 100

        const i = Math.floor(h)
        const f = h - i
        const p = b * (1 - s)
        const q = b * (1 - s * f)
        const t = b * (1 - s * (1 - f))
        switch (i % 6) {
            case 0:
                return {r: Math.round(b * 255), g: Math.round(t * 255), b: Math.round(p * 255)}
            case 1:
                return {r: Math.round(q * 255), g: Math.round(b * 255), b: Math.round(p * 255)}
            case 2:
                return {r: Math.round(p * 255), g: Math.round(b * 255), b: Math.round(t * 255)}
            case 3:
                return {r: Math.round(p * 255), g: Math.round(q * 255), b: Math.round(b * 255)}
            case 4:
                return {r: Math.round(t * 255), g: Math.round(p * 255), b: Math.round(b * 255)}
            case 5:
                return {r: Math.round(b * 255), g: Math.round(p * 255), b: Math.round(q * 255)}
            default:
                return {r: 0, g: 0, b: 0}
        }
    },
    _toHex: (value: number) => {
        const hex = Math.round(value).toString(16)
        return hex.length === 1 ? '0' + hex : hex
    },
    rgbToHex: (rgb: RGB): HEX => {
        const toHex = colorUtils._toHex;
        const a = opacity.value / 100;
        const alphaHex = a < 1 ? toHex(Math.round(a * 255)) : ''
        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}${alphaHex}`.toUpperCase()
    },
    hexToHsl: (hex: HEX): [HSL, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex)
        if (!result) {
            return [{h: 0, s: 100, l: 100}, 100]
        }
        const r = parseInt(result[1], 16) / 255
        const g = parseInt(result[2], 16) / 255
        const b = parseInt(result[3], 16) / 255
        const a = result[4] ? parseInt(result[4], 16) / 255 : 1

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        let h = 0
        const v = max

        const d = max - min
        const s = max === 0 ? 0 : d / max

        if (max === min) {
            h = 0
        } else {
            if (max === r) {
                h = (g - b) / d + (g < b ? 6 : 0);
            } else if (max === g) {
                h = (b - r) / d + 2;
            } else if (max === b) {
                h = (r - g) / d + 4;
            }
            h /= 6
        }

        return [{h: h * 360, s: s * 100, l: v * 100}, a * 100]
    },
    rgbToHexHsl: (rgb: RGB): HSL => {
        const {r, g, b} = rgb;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        const v = max / 255;

        const d = max - min;
        const s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return {h: h * 360, s: s * 100, l: v * 100};
    }
}

const updateHslRefs = (newVal: HSL, a: number = opacity.value) => {
    opacity.value = a
    hsl.h = newVal.h
    hsl.s = newVal.s
    hsl.l = newVal.l
}

const onUserHexInput = (hex: HEX, initial = false) => {
    if (!initial && hex == modelValue.value) return;
    const [hsl, a] = colorUtils.hexToHsl(hex)
    updateHslRefs(hsl, a)
    !initial && updateColor()
}

const onUserRgbInput = () => {
    console.log(opacity.value)
    const hsl = colorUtils.rgbToHexHsl(rgb.value)
    updateHslRefs(hsl)
    updateColor()
}
const eyeDropperFn = props.eyeDropper && 'EyeDropper' in window ? (window as any).EyeDropper : undefined
const pickColor = async () => {
    const eyeDropper = eyeDropperFn();
    try {
        const {sRGBHex} = await eyeDropper.open()
        onUserHexInput(sRGBHex)
    } catch (error) {
    }
}
watch(hsl, debouncedUpdateColor)
watch(modelValue, () => setInitialColor())
watch(hsl, () => {
    if (!isPicking.value)
        pickXY.value = {x: hsl.s, y: 100 - hsl.l}
})

onMounted(() => {
    if (canvas.value) {
        ctx.value = canvas.value.getContext('2d') ?? undefined
        setInitialColor()
    }
})

const pal = props.palette ? (function () {
    const key = 'color-picker-palette'
    const _fromStorage = localStorage.getItem(key)
    const colors = ref<string[]>(_fromStorage ? JSON.parse(_fromStorage) : [])
    const updateLocalStorage = () => localStorage.setItem(key, JSON.stringify(colors.value))
    const add = (color: string) => {
        if (!colors.value.includes(color)) {
            colors.value.push(color)
            updateLocalStorage()
        }
    }
    const remove = (color: string) => {
        colors.value = colors.value.filter((c) => c !== color)
        updateLocalStorage()
    }
    return {colors, add, remove}
})() : undefined
</script>

<template>
    <form
        @submit.prevent
        :class="[
            twMerge('color-picker w-72 flex flex-col gap-4 items-center p-4 rounded-lg shadow-md', classes.surface),
            { 'select-none': isPicking }
        ]"
    >
        <div class="relative h-36 w-full">
            <canvas
                ref="canvas"
                @mousedown="startPicking"
                @mouseup="stopPicking"
                :class="twMerge('shadow cursor-crosshair rounded-md w-full h-full outline outline-1', classes?.canvas)"
            ></canvas>
            <div
                :class="twMerge('absolute w-4 h-4 border-4  rounded-full shadow-sm pointer-events-none', classes.canvasCircle)"
                :style="{
                  left: `${pickXY.x}%`,
                  top: `${pickXY.y}%`,
                  transform: 'translate(-50%, -50%)'
                }"
            ></div>
        </div>
        <div class="flex gap-3 items-center w-full">
            <button v-if="eyeDropperFn" @click="pickColor" class="grid place-items-center">
                <svg width="1em" height="1em" viewBox="0 0 24 24">
                    <path fill="currentColor" d="m19.35 11.72l-2.13 2.13l-1.41-1.42l-7.71 7.71L3.5 22L2 20.5l1.86-4.6l7.71-7.71l-1.42-1.41l2.13-2.13zM16.76 3A3 3 0 0 1 21 3a3 3 0 0 1 0 4.24l-1.92 1.92l-4.24-4.24zM5.56 17.03L4.5 19.5l2.47-1.06L14.4 11L13 9.6z"/>
                </svg>
            </button>
            <div :class="twMerge('opacity-wrapper w-7 h-7', classes.opacityWrapper)">
                <div class="w-7 h-7 " :style="{ backgroundColor: hexColor }"></div>
            </div>
            <div class="flex-1 space-y-3">
                <div class="relative w-full h-5">
                    <input
                        type="range" min="0" max="360"
                        v-model="hsl.h"
                        class="w-full h-3 rounded-full appearance-none cursor-pointer"
                        style="background: linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))"
                        @input="debouncedUpdateColor"
                    />
                </div>
                <div :class="twMerge('relative w-full h-2 rounded-full', classes.opacityWrapper)">
                    <input
                        type="range" min="0" max="100"
                        v-model="opacity"
                        class="w-full h-3 appearance-none cursor-pointer"
                        :style="{ background: `linear-gradient(to right, transparent, ${hexWithoutAlpha})` }"
                        @input="debouncedUpdateColor"
                    />
                </div>
            </div>
        </div>
        <div class="flex items-center justify-between gap-3">
            <div class="relative flex-1 flex-grow">
                <input
                    type="text"
                    :value="hexColor"
                    @change="onUserHexInput(($event.target as any).value)"
                    :class="twMerge('px-1 w-full text-center text-sm py-px border rounded', classes.input)"
                />
                <label class="absolute -top-1.5 left-1 font-bold text-xs leading-none">Hex</label>
            </div>
            <div class="flex space-x-1 items-center">
                <div v-for="key in Object.keys(rgb)" :key="key" class="relative">
                    <input
                        type="number" min="0" max="255"
                        v-model="(rgb as any)[key]"
                        @input="onUserRgbInput"
                        :class="twMerge('w-9 text-sm py-px px-px text-center outline-none border rounded', classes.input)"
                    />
                    <label class="absolute -top-1.5 left-1 font-bold text-xs leading-none">{{ key.toUpperCase() }}</label>
                </div>
                <div class="relative">
                    <input
                        type="number" min="0" max="100"
                        v-model="opacity"
                        @input="onUserRgbInput"
                        :class="twMerge('w-9 text-sm py-px px-px text-center outline-none border rounded', classes.input)"
                    />
                    <label class="absolute -top-1.5 left-1 font-bold text-xs leading-none">A</label>
                </div>
            </div>
        </div>
        <div v-if="pal" class="w-full">
            <h3 class="text-sm mb-2 opacity-80 leading-none">Palette</h3>
            <div class="grid grid-cols-8 gap-2">
                <div
                    v-for="color in pal.colors.value"
                    :key="color"
                    class="w-7 h-7 rounded-lg cursor-pointer relative group"
                    :style="{ backgroundColor: color }"
                    @click="onUserHexInput(color)"
                >
                    <button
                        @click.stop="pal.remove(color)"
                        :class="twMerge('absolute -top-1 -right-1 grid place-items-center p-px rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-500', classes.paletteRemove)"
                    >
                        <svg class="size-3" viewBox="0 0 512 512">
                            <path fill="currentColor" d="m289.94 256l95-95A24 24 0 0 0 351 127l-95 95l-95-95a24 24 0 0 0-34 34l95 95l-95 95a24 24 0 1 0 34 34l95-95l95 95a24 24 0 0 0 34-34Z"/>
                        </svg>
                    </button>
                </div>
                <button
                    v-if="pal.colors.value.length < 16"
                    @click="pal.add(hexColor)"
                    :class="twMerge('w-7 h-7 rounded-lg flex items-center justify-center', classes.paletteAdd)"
                >
                    <svg width="1em" height="1em" viewBox="0 0 20 20">
                        <g fill="currentColor">
                            <path d="M5 11a1 1 0 1 1 0-2h10a1 1 0 1 1 0 2z"/>
                            <path d="M9 5a1 1 0 0 1 2 0v10a1 1 0 1 1-2 0z"/>
                        </g>
                    </svg>
                </button>
            </div>
        </div>
    </form>
</template>
