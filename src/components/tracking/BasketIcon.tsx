// Simple line-art basket, colored to match the app's blue accent (#3874FF)
// instead of the brown wicker-basket emoji, which can't be recolored.
export default function BasketIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="#3874FF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 10h16l-1.4 8.8a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7L4 10Z"
        stroke="#3874FF"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="#eaf1ff"
      />
      <path d="M8 13.5h8M7.4 16.8h9.2" stroke="#3874FF" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
