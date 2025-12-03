/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			keyframes: {
				"fade-in": {
					"0%": { opacity: "0", transform: "translateY(4px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				"fade-in": "fade-in 0.25s ease-out",
			},
			fontFamily: {
				poppins: ["Poppins", "sans-serif"],
			},
			colors: {
				dark: {
					900: "#0F0F2F", // fondo principal → azul muy oscuro
					800: "#1A1A3D", // cards, contenedores → morado oscuro
					700: "#7676a3",
					600: "#2E2E5C", // bordes, texto secundario → azul grisáceo
				},
				limeyellow: {
					400: "#7C6AF7",
					500: "#4F46E5", // primary → azul eléctrico
					600: "#4338CA", // hover → azul intenso
					100: "#1E1B2F", // fondo/acento suave → oscuro
				},
				neutral: {
					100: "#1F2937", // texto sobre oscuro → gris oscuro
					200: "#374151", // bordes claros → gris medio
					300: "#4B5563", // texto neutral → gris medio-oscuro
					400: "#6B7280", // textos secundarios → gris suave
				},
				text: {
					primary: "#E0E7FF", // texto principal sobre fondo oscuro → azul claro
					secondary: "#C7D2FE", // texto menos importante → azul pálido
					accent: "#4F46E5", // texto resaltado / links / botones → azul eléctrico
					muted: "#9CA3AF", // texto de menor relevancia → gris azulado
					error: "#F87171", // alertas / errores → rojo suave
					success: "#4ADE80", // mensajes positivos → verde brillante
					warning: "#FACC15", // advertencias → amarillo vibrante
				},
			},
		},
	},
	plugins: [require("tailwind-scrollbar")],
	variants: {
		scrollbar: ["rounded"],
	},
};
