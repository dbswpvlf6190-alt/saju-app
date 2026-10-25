export default function EnLayout({ children }: LayoutProps<"/en">) {
  return (
    <div lang="en" className="flex flex-1 flex-col">
      {children}
    </div>
  );
}
