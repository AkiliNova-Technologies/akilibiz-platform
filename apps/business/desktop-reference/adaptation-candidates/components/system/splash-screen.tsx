import images from "@/assets/images";

export default function SplashScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-transparent overflow-hidden">
      
      <div className="relative w-full h-full overflow-hidden rounded-xs shadow-2xl">
        
        {/* Background Image */}
        <img
          src={images.placeholder}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex flex-1 items-center justify-center">
            <img
              src={images.logo}
              alt="AkiliBiz Logo"
              className="h-32 w-32 rounded-xl object-contain"
            />
          </div>

          <div className="flex items-center justify-center pb-10 -mt-15">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        </div>
        </div>

      </div>
    </div>
  );
}