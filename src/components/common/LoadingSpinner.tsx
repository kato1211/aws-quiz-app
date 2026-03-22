interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }

export default function LoadingSpinner({ size = 'md', label }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-aws-orange`} />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}
