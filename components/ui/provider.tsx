"use client"

import { ChakraProvider, extendTheme } from "@chakra-ui/react"

const theme = extendTheme({
    radii: {
        none: "0",
        sm: "0",
        base: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "9999px",
    },
    components: {
        Button: { baseStyle: { borderRadius: "0" } },
        Input: { baseStyle: { field: { borderRadius: "0" } } },
        Select: { baseStyle: { field: { borderRadius: "0" } } },
        Textarea: { baseStyle: { borderRadius: "0" } },
        Modal: { baseStyle: { dialog: { borderRadius: "0" } } },
        Popover: { baseStyle: { content: { borderRadius: "0" } } },
        Menu: { baseStyle: { list: { borderRadius: "0" } } },
        Card: { baseStyle: { container: { borderRadius: "0" } } },
        Alert: { baseStyle: { container: { borderRadius: "0" } } },
        Badge: { baseStyle: { borderRadius: "0" } },
        Tooltip: { baseStyle: { borderRadius: "0" } },
    }
})

export function Provider(props: { children: React.ReactNode }) {
    return (
        <ChakraProvider theme={theme}>
            {props.children}
        </ChakraProvider>
    )
}
