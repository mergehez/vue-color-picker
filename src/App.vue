<script setup lang="ts">
import ColorPicker from "./components/ColorPicker.vue";
import {onMounted, onUnmounted, ref, watchEffect} from "vue";

const useColorMode = () => {

    const mediaQuery = window?.matchMedia('(prefers-color-scheme: dark)')
    const isDark = ref(
        typeof window !== 'undefined'
            ? mediaQuery.matches
            : false
    )

    const toggle = () => isDark.value = !isDark.value
    const setToLight = () => isDark.value = false
    const setToDark = () => isDark.value = true

    const listener = () => isDark.value = mediaQuery.matches
    onMounted(() => {
        watchEffect(() => {
            if (isDark.value) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
        })

        mediaQuery.addEventListener('change', listener)
    })

    onUnmounted(() => {
        mediaQuery.removeEventListener('change', listener)
    })


    return {
        isDark,
        toggle,
        setToLight,
        setToDark
    }
}

const colorMode = useColorMode()
const color = ref('#4037A9')
</script>

<template>
    <div class="relative w-screen h-screen grid place-items-center bg-gray-50 dark:bg-gray-950 text-black dark:text-white">
        <div class="">
            <ColorPicker v-model="color" :show-eye-dropper="true" :show-palette="true"/>
            <div class="flex gap-2 items-center mt-3 justify-center">
                <span>Selection:</span>
                <div class="inline-block size-6" :style="{backgroundColor: color}"></div>
                <span>{{color}}</span>
            </div>
        </div>

        <div class="absolute right-6 bottom-6 flex gap-2">
            <button @click="colorMode.setToDark()" class="border px-2 rounded-md">dark</button>
            <button @click="colorMode.setToLight()" class="border px-2 rounded-md">light</button>
        </div>
    </div>
</template>

<style scoped>
.logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
}

.logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
    filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
