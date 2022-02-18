export function animation(refy) {
    
    const logoAnimationRef = useRef();
    const { useEffect, useRef, forwardRef } = React;
useEffect(() => {
    gsap.to(logoAnimationRef.current, { rotation: "+=360" });
  });

  return (<img src="assets/img/logo/xalians_logo.png" className="xalians-logo" ref={logoAnimationRef} />);
}