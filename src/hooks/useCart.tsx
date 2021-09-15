import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    // Verificar no local storage se tem algum dado salvo com essa chave
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // Criar um novo array a partir do carrinho que ja existe
      const updatedCart = [...cart] // mantendo a regra da imutabilidade.... diferente de fazer updatedCart = cart (esse modo aponta para cart) o outro cria um novo igual a cart
      const productExists = updatedCart.find(product => product.id === productId)

      const stock = await api.get(`stock/${productId}`)
      const stockAmount = stock.data.amount // amount in stock
      const currentAmount = productExists ? productExists.amount : 0 // current amount in chart
      const amount = currentAmount + 1 // amount desejado

      if( amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productExists) {
        // atualiza chart
        productExists.amount = amount
      } else {
        // adiciona no chart
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }

        updatedCart.push(newProduct)
      }

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))


    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error()
      }


    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return ;
      }

      const stock = await api.get(`/stock/${productId}`) // Procuro no estoque o item desejado
      const stockAmount = stock.data.amount; // Vejo quantidade disponivel

      // Se quantidade disponivel for menor que o amount ja pula fora
      if (amount >= stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      } else {
        // Caso quantidade disponivel maior que amount
        const updatedCart = [...cart]
        const productExists = updatedCart.find(product => product.id === productId)

        if (productExists) {
          productExists.amount = amount;
          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        } else {
          throw Error()
        }
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
