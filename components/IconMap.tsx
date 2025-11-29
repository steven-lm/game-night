import { 
  Trophy, 
  Star, 
  Crown, 
  Zap, 
  Flame, 
  Rocket, 
  Gem, 
  Medal, 
  Target,
  LucideIcon
} from 'lucide-react';

export const getAvatarIcon = (name: string, props: any = {}) => {
  const iconProps = { size: 24, ...props };

  // Check if it's an image path
  if (name.startsWith('/')) {
    return (
      <img 
        src={name} 
        alt="Team Avatar" 
        className={`object-contain rounded-full ${props.className || ''}`}
        style={{ 
          width: iconProps.size, 
          height: iconProps.size,
          ...props.style 
        }} 
      />
    );
  }

  switch (name) {
    case 'Trophy': return <Trophy {...iconProps} />;
    case 'Star': return <Star {...iconProps} />;
    case 'Crown': return <Crown {...iconProps} />;
    case 'Lightning': return <Zap {...iconProps} />;
    case 'Fire': return <Flame {...iconProps} />;
    case 'Rocket': return <Rocket {...iconProps} />;
    case 'Diamond': return <Gem {...iconProps} />;
    case 'Medal': return <Medal {...iconProps} />;
    default: return <Target {...iconProps} />;
  }
};
