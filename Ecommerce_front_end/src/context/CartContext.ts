// CartContext.ts
import {
    createContext,
    createElement,
    useContext,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";

interface CartContextType {
    cartItemCount: number;
    setCartItemCount: Dispatch<SetStateAction<number>>;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItemCount, setCartItemCount] = useState(0);

    return createElement(
        CartContext.Provider,
        { value: { cartItemCount, setCartItemCount } },
        children
    );
};

export const useCart = () => {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error("useCart must be used inside CartProvider");
    }

    return context;
};