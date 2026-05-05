const tintColorLight = '#4255ff';
const tintColorDark = '#a5b4fc';

export default {
  light: {
    text: '#111827',
    /** App screen background — avoids "all white" in light mode */
    background: '#f3f4f6',
    /** Cards / sheets on top of screen */
    surface: '#ffffff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#eef2ff',
    background: '#141c2e',
    surface: '#1d2a3a',
    tint: tintColorDark,
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorDark,
  },
};
