// components/LedLight.jsx
export default function LedLight({ color = 'red', blinking = true, label = '' }) {
  const colors = {
    red: 'bg-[#FF3366] shadow-[0_0_10px_#FF3366]',
    green: 'bg-[#00FF88] shadow-[0_0_10px_#00FF88]',
    blue: 'bg-[#2A6DFF] shadow-[0_0_10px_#2A6DFF]',
    yellow: 'bg-[#F0C564] shadow-[0_0_10px_#F0C564]'
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${colors[color]} ${blinking ? 'animate-pulse' : ''}`} />
      {label && <span className="text-xs text-[#8892B0]">{label}</span>}
    </div>
  );
}