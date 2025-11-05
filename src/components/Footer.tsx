import { Heart } from "lucide-react";
const Footer = () => {
  return <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4 bg-transparent">
        <div className="grid md:grid-cols-4 gap-8 mb-8 bg-transparent">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-zinc-50">FinanceFlow</h3>
            <p className="text-sm text-slate-50">
              Transformando a maneira como você gerencia suas finanças pessoais.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-base text-[#2ed56a]">Produto</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80 bg-transparent">
              <li className="text-slate-50"><a href="#recursos" className="hover:text-primary-foreground transition-colors">Recursos</a></li>
              <li className="text-slate-50"><a href="#precos" className="hover:text-primary-foreground transition-colors">Preços</a></li>
              <li className="text-slate-50"><a href="#" className="hover:text-primary-foreground transition-colors">FAQ</a></li>
              <li className="text-slate-50"><a href="#" className="hover:text-primary-foreground transition-colors">Roadmap</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[#2ed56a]">Empresa</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li className="text-slate-50"><a href="#" className="hover:text-primary-foreground transition-colors">Sobre</a></li>
              <li className="text-slate-50"><a href="#" className="hover:text-primary-foreground transition-colors">Blog</a></li>
              <li className="text-slate-50"><a href="#" className="hover:text-primary-foreground transition-colors">Carreiras</a></li>
              <li className="text-slate-50"><a href="#" className="hover:text-primary-foreground transition-colors">Contato</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[#2ed56a]">Legal</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li className="text-slate-50"><a href="#" className="hover:text-primary-foreground transition-colors">Privacidade</a></li>
              <li className="text-slate-50"><a href="#" className="hover:text-primary-foreground transition-colors">Termos</a></li>
              <li className="text-slate-50"><a href="#" className="hover:text-primary-foreground transition-colors">Segurança</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-50">
            © 2024 FinanceFlow. Todos os direitos reservados.
          </p>
          
          <p className="text-sm flex items-center gap-1 text-stone-50">
            Feito com <Heart className="w-4 h-4 text-success fill-success" /> para transformar suas finanças
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;