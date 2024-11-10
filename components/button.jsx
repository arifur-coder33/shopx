export default function Button({children, onClick, bgcolor,textColor, className }){

    return (
        <button onClick={onClick} className={`border border-slate-300 ${bgcolor ? bgcolor: 'bg-orange-500 hover:bg-orange-600'}  ${textColor ?? 'text-white'}  p-2 rounded-md ${className}`}>
        {children}
        </button>
    )
}