import { Button } from './Button';
export function QuickCapture() { return <form className="quick-capture" onSubmit={event => event.preventDefault()}><span>＋</span><input aria-label="Adicionar uma demanda" placeholder="O que você precisa lembrar?" /><Button type="submit">Adicionar</Button></form>; }
