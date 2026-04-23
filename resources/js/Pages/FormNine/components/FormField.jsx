const FormField = ({ label, value, labelWidth = '80px' }) => (
    <div className='flex items-end gap-2'>
        <span className={`text-xs whitespace-nowrap`} style={{ width: labelWidth }}>
            {label}
        </span>
        {!!value ? (
            <div className='flex-grow border-b border-black text-xs px-2'>
                {value}
            </div>
        ) : (
            <input value={value} type="text" className='flex-grow border-b border-black text-xs px-2 outline-none bg-transparent' />
        )}
    </div>
);

export default FormField