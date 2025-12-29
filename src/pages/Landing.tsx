import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
const Landing = () => {
  return <div className="min-h-screen">
      <Hero />
      <Features />
      <Pricing />
      <Footer className="bg-[#0f1629]" />
    </div>;
};
export default Landing;