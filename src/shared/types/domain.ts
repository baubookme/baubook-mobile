import type { ImageSourcePropType } from 'react-native';

export type TabKey = 'home' | 'map' | 'dog' | 'walks' | 'alerts' | 'profile';

export type PlaceKind = 'dog_area' | 'walk' | 'vet' | 'pet_shop' | 'warning_zone' | 'beach' | 'trail' | 'service' | 'other';

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'escalated' | 'removed';

export type ContentVisibility = 'public' | 'friends' | 'private' | 'shadow_hidden' | 'removed';

export type AlertStatus = 'active' | 'resolved' | 'expired' | 'abuse_locked';

export interface FeatureCardModel {
  title: string;
  eyebrow: string;
  description: string;
  icon: ImageSourcePropType;
  tint?: 'teal' | 'orange' | 'pink' | 'green' | 'red';
  tab?: TabKey;
}

export interface ComingSoonFeatureModel {
  title: string;
  subtitle: string;
  icon: ImageSourcePropType;
  tone: 'teal' | 'orange' | 'pink' | 'green' | 'red';
}

export interface PlaceModel {
  id: string;
  name: string;
  kind: PlaceKind;
  area: string;
  distanceLabel: string;
  description: string;
  tags: string[];
  scoreLabel: string;
  icon: ImageSourcePropType;
  moderationStatus: ModerationStatus;
}

export interface WalkPlanModel {
  id: string;
  dogName: string;
  placeName: string;
  startsAtLabel: string;
  message: string;
  acceptsCompany: boolean;
  tags: string[];
}

export interface AlertModel {
  id: string;
  type: 'lost_dog' | 'danger';
  title: string;
  area: string;
  status: AlertStatus;
  ttlLabel: string;
  description: string;
  icon: ImageSourcePropType;
}

export interface DogProfileDraft {
  name: string;
  headline: string;
  personalityTags: string[];
  socialityTags: string[];
  walkTags: string[];
  notes: string[];
}
