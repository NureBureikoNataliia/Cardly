const tintColorLight = '#4255ff';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#111827',
    /** App screen background — avoids “all white” in light mode */
    background: '#f3f4f6',
    /** Cards / sheets on top of screen */
    surface: '#ffffff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#f9fafb',
    background: '#111827',
    surface: '#1f2937',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};
