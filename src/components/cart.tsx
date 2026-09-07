'use client';

import * as React from 'react';
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Minus, Plus, Trash2, ShoppingCart, Package } from 'lucide-react';
import Image from 'next/image';
import { Input } from './ui/input';
import { useCart } from '@/contexts/cart-context';
import Link from 'next/link';

export function Cart() {
  const { cartItems, updateQuantity, removeItem, cartCount, totalPrice, totalDeliveryFee } = useCart();

  const total = totalPrice + totalDeliveryFee;

  return (
    <SheetContent className="flex w-full flex-col pr-0 sm:max-w-md bg-white dark:bg-zinc-950">
      <SheetHeader className="px-6">
        <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6"/>
            My Basket ({cartCount})
        </SheetTitle>
      </SheetHeader>
      <Separator />
      {cartItems.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4 p-6 pr-6">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-secondary">
                    {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.store}</p>
                    <div className="mt-2 flex items-center justify-between">
                       <p className="font-semibold">£{item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                                className="h-7 w-12 text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-4 bg-secondary rounded-full">
                 <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Your basket is empty</h3>
            <p className="text-muted-foreground max-w-xs">Looks like you haven't added anything to your basket yet.</p>
        </div>
      )}
      {cartItems.length > 0 && (
          <SheetFooter className="border-t bg-background p-6 space-y-4">
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>£{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>£{totalDeliveryFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>£{total.toFixed(2)}</span>
                </div>
            </div>
            <SheetClose asChild>
                <Button size="lg" className="w-full" asChild>
                    <Link href="/shopping/checkout">Proceed to Checkout</Link>
                </Button>
            </SheetClose>
          </SheetFooter>
      )}
    </SheetContent>
  );
}
