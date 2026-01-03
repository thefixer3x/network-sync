import './globals.css';

export const metadata = {
  title: 'Social Media Automation Platform',
  description: 'Intelligent social media automation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
