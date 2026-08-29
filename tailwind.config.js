/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	// eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
	plugins: [require('daisyui')],
	daisyui: {
		themes: [
			{
				// SBB CFF FFS brand colors, sourced from the official
				// @sbb-esta/lyne-design-tokens package.
				light: {
					'color-scheme': 'light',
					primary: '#eb0000', // sbb-color-red
					'primary-content': '#ffffff',
					secondary: '#212121', // sbb-color-charcoal
					'secondary-content': '#ffffff',
					accent: '#2d327d', // sbb-color-blue
					'accent-content': '#ffffff',
					neutral: '#444444', // sbb-color-iron
					'neutral-content': '#f6f6f6',
					'base-100': '#ffffff', // sbb-color-white
					'base-200': '#f6f6f6', // sbb-color-milk
					'base-300': '#e5e5e5', // sbb-color-cloud
					'base-content': '#151515', // sbb-color-midnight
					info: '#2d327d', // sbb-color-blue
					success: '#008233', // sbb-color-green-light
					warning: '#fcbb00', // sbb-color-peach-light
					error: '#c60018', // sbb-color-red125
					'--rounded-box': '0.5rem',
					'--rounded-btn': '2rem',
					'--rounded-badge': '2rem',
					'--tab-radius': '0.5rem'
				}
			},
			{
				dark: {
					'color-scheme': 'dark',
					primary: '#eb0000', // sbb-color-red (brand red stays constant)
					'primary-content': '#ffffff',
					secondary: '#f6f6f6', // sbb-color-milk
					'secondary-content': '#151515',
					accent: '#5a5fa8', // lightened sbb-color-blue for dark contrast
					'accent-content': '#ffffff',
					neutral: '#686868', // sbb-color-granite
					'neutral-content': '#f6f6f6',
					'base-100': '#212121', // sbb-color-charcoal
					'base-200': '#1b1b1b',
					'base-300': '#151515', // sbb-color-midnight
					'base-content': '#ffffff',
					info: '#5a5fa8',
					success: '#109d47', // sbb-color-green-dark
					warning: '#ffc727', // sbb-color-peach-dark
					error: '#ff3838', // sbb-color-red85
					'--rounded-box': '0.5rem',
					'--rounded-btn': '2rem',
					'--rounded-badge': '2rem',
					'--tab-radius': '0.5rem'
				}
			}
		]
	}
};
