with open('components/DielineGenerator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add دورانی and شات لایو to the right side bar. 
# Search for <RefreshCw className="w-4 h-4 mx-auto" /></button>
right_sidebar_target = """<button onClick={() => setAutoRotate(!autoRotate)} className={`p-2 rounded-xl transition-all border ${autoRotate ? 'bg-sky-600 border-sky-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="چرخش خودکار (Auto Rotate)"><RefreshCw className="w-4 h-4 mx-auto" /></button>"""

replacement_sidebar = right_sidebar_target + """
                        <button onClick={() => setCameraOrbit(!cameraOrbit)} className={`p-2 rounded-xl transition-all border ${cameraOrbit ? 'bg-violet-600 border-violet-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="گردش دوربین (Camera Orbit)"><Orbit className="w-4 h-4 mx-auto" /></button>
                        <button onClick={handleCaptureSnapshot} className="p-2 rounded-xl transition-all border bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-indigo-900 hover:text-indigo-300 hover:border-indigo-500" title="برداشت اسکرین شات (Live Snapshot)"><Camera className="w-4 h-4 mx-auto" /></button>"""

content = content.replace(right_sidebar_target, replacement_sidebar)
content = content.replace("import { Layers, Cuboid, Info, HelpCircle, User, Settings2, Trash2, Camera, Download, LayoutTemplate, Wand2, Boxes, ChevronDown, CheckCircle, Sliders, MonitorPlay, Zap, Ruler, ShieldCheck, Box, RefreshCw, X, Play, Pause, Flame, Settings, ImageIcon, FileCode, Check, Target, Rotate3d, Upload, ZoomIn, Eye, Layers3, ArrowDownToLine, Maximize, Printer }", "import { Layers, Cuboid, Info, HelpCircle, User, Settings2, Trash2, Camera, Download, LayoutTemplate, Wand2, Boxes, ChevronDown, CheckCircle, Sliders, MonitorPlay, Zap, Ruler, ShieldCheck, Box, RefreshCw, X, Play, Pause, Flame, Settings, ImageIcon, FileCode, Check, Target, Rotate3d, Upload, ZoomIn, Eye, Layers3, ArrowDownToLine, Maximize, Printer, Orbit }")

# Remove Section 3 completely
import re
# We match from {/* Section 3: actions & camera */} up to the </div> right before {/* Collapsing icon trigger */}
pattern = r"\{/\* Section 3: actions & camera \*/\}.*?(?=\{/\* Collapsing icon trigger \*/\})"
content = re.sub(pattern, "", content, flags=re.DOTALL)

with open('components/DielineGenerator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
