import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Roadmap from "@/components/Roadmap";
import Footer from "@/components/Footer";
const Landing = () => {
  return <div className="min-h-screen">
      <Hero />
      <Features />
      <Pricing />
      <Roadmap />
      <Footer />
    </div>;
};
export default Landing;