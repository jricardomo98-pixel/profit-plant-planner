declare module '@/components/Aurora' {
  interface AuroraProps {
    colorStops?: string[];
    amplitude?: number;
    blend?: number;
    time?: number;
    speed?: number;
  }
  const Aurora: (props: AuroraProps) => JSX.Element;
  export default Aurora;
}
