import './globals.css'

export const metadata = {
  title: 'Registro de Horas Extras',
  description: 'Sistema de registro de horas extras',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}