export type ActorRole = 'admin' | 'customer';

export type ActorDto = {
  actorId: string;
  role: ActorRole;
  customerId?: string;
};
