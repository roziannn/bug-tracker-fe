export interface AuditFields {
  CreatedBy: string | null;
  CreatedDate: string;
  UpdatedBy: string | null;
  UpdatedDate: string | null;
}

export interface User extends AuditFields {
  Id: number;
  Name: string;
  Email: string;
  IsActive: boolean;
}

export interface Role extends AuditFields {
  Id: number;
  NewId: string;
  Name: string;
  IsActive: boolean;
}

export interface RoleClaim extends AuditFields {
  Id: number;
  RoleId: number;
  Name: string;
  Email: string;
  IsActive: boolean;
}

export interface Paged<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}