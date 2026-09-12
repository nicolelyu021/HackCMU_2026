/** Domain errors thrown by any Repo implementation; services/api maps them to the HTTP error envelope. */
export class NotFoundError extends Error {
  readonly code = 'not_found' as const;
  constructor(
    public readonly entity: string,
    public readonly id: string,
  ) {
    super(`${entity} ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class LockedPinError extends Error {
  readonly code = 'locked_pin' as const;
  constructor(public readonly pin_id: string) {
    super(`Pin ${pin_id} was created by the user and cannot be changed by replan`);
    this.name = 'LockedPinError';
  }
}
