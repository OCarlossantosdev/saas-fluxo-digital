"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    // Se for escuro, vira claro. Se for qualquer outra coisa (claro ou sistema), vira escuro.
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} className="relative overflow-hidden">
      {/* SOL (Para o modo Claro):
         - rotate-0 scale-100: Estado normal (visível e reto)
         - dark:-rotate-90 dark:scale-0: No modo escuro, ele gira para a esquerda e encolhe (some)
      */}
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-500 ease-in-out dark:-rotate-90 dark:scale-0 text-orange-500" />
      
      {/* LUA (Para o modo Escuro):
         - absolute: Fica exatamente em cima do sol
         - rotate-90 scale-0: Estado normal (invisível e girado)
         - dark:rotate-0 dark:scale-100: No modo escuro, gira para o centro e cresce (aparece)
      */}
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-500 ease-in-out dark:rotate-0 dark:scale-100 text-blue-400" />
      
      <span className="sr-only">Alternar tema</span>
    </Button>
  )
}