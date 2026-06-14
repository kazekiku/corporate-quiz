// components/NeonBorder.jsx
export default function NeonBorder({ children, color = 'blue', className = '' }) {
  const colors = {
    blue: 'border-[#2A6DFF] shadow-[0_0_10px_#2A6DFF]',
    red: 'border-[#FF3366] shadow-[0_0_10px_#FF3366]',
    green: 'border-[#00FF88] shadow-[0_0_10px_#00FF88]',
    yellow: 'border-[#F0C564] shadow-[0_0_10px_#F0C564]'
  };
  
  return (
    <div className={`border-2 rounded-lg ${colors[color]} ${className}`}>
      {children}
    </div>
  );
}