import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
<<<<<<< HEAD
    <Sonner
=======
    (<Sonner
>>>>>>> 757e3cd5bb546a7f35762f516ccb5a4efeda8765
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
<<<<<<< HEAD
      {...props} />
=======
      {...props} />)
>>>>>>> 757e3cd5bb546a7f35762f516ccb5a4efeda8765
  );
}

export { Toaster }
