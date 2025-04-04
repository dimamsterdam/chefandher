
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Make sure to render immediately without waiting for any promises
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
