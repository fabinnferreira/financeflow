import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
const Landing = () => {
  return <div className="min-h-screen">
      <Hero />
      <Features />
      <Pricing />
      <Footer className="bg-[#111319]" />
    </div>;
};
export default Landing;