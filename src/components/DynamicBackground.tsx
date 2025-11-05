const DynamicBackground = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
    <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
    <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-success/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
    <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-primary-light/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '5s' }}></div>
    <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-success-light/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '7s' }}></div>
  </div>
);

export default DynamicBackground;
