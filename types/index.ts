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
  RoleId?: number | null;
  RoleName?: string | null;
}

export interface Role extends AuditFields {
  Id: number;
  NewId: string;
  Name: string;
  IsActive: boolean;
  MenuCount?: number;
  ActionCount?: number;
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
export interface RoleAccess {
  menus: string[];
  actions: string[];
}

export interface NavMenu {
  id: string;
  label: string;
  parentId: string | null;
  path: string;
  icon: string;
}

export interface CurrentUser {
  name: string;
  email: string;
  role: { id: number; name: string } | null;
  menus: string[];
  actions: string[];
  navigation: NavMenu[];
}

export interface EnvVar extends AuditFields {
  Id: number;
  Environment: string;
  Label: string;
  Key: string;
  /** Null untuk variabel secret: nilainya baru dikirim saat diminta (tombol mata / Copy .env). */
  Value: string | null;
  IsSecret: boolean;
  HasValue: boolean;
}

export interface Category extends AuditFields {
  Id: number;
  CategoryName: string;
  Name: string;
  Description: string;
  IsActive: boolean;
}

export interface Project extends AuditFields {
  Id: number;
  /** ID bergaya GUID, dipakai di URL. */
  NewId: string;
  Name: string;
  OwnerId: number;
  OwnerName: string;
  Description: string;
  /** Low, Medium, atau High. */
  Priority: string;
  GoLiveDate: string | null;
  Tags: string[];
  PhaseCount: number;
  /** Phase timeline, urut sesuai Sequence. Dipakai untuk menentukan status saat ini. */
  Phases: { Name: string; StartDate: string; EndDate: string }[];
  /** Tanggal phase paling awal dan paling akhir (YYYY-MM-DD). Null kalau project belum punya phase. */
  TimelineStart: string | null;
  TimelineEnd: string | null;
  IsActive: boolean;
}

export interface ProjectPhase {
  Id: number;
  Name: string;
  StartDate: string;
  EndDate: string;
  Sequence: number;
}

export interface ProjectDetail extends AuditFields {
  Id: number;
  NewId: string;
  Name: string;
  OwnerId: number;
  OwnerName: string;
  Description: string;
  Priority: string;
  GoLiveDate: string | null;
  IsActive: boolean;
  Tags: { Id: number; Name: string }[];
  Phases: ProjectPhase[];
  Repositories: string[];
  Environments: { Environment: string; Url: string }[];
}

export interface Team extends AuditFields {
  Id: number;
  /** ID bergaya GUID, dipakai di URL. */
  NewId: string;
  DomainId: number;
  /** Nama Teams Domain-nya; sekaligus nama group team. */
  DomainName: string;
  LeadId: number;
  LeadName: string;
  LeadEmail: string;
  /** Jumlah anggota yang aktif. */
  MemberCount: number;
  IsActive: boolean;
}

export interface TeamMember extends AuditFields {
  Id: number;
  TeamId: number;
  UserId: number;
  Name: string;
  Email: string;
  Role: string;
  AccessLevel: string;
  IsActive: boolean;
}
