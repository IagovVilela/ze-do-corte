export type AdminReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  clientDisplayName: string;
  clientPhone: string;
  createdAt: string;
  appointment: {
    startsAt: string;
    serviceName: string;
  } | null;
};

export type AdminReviewsSnapshot = {
  ratingAvg: number | null;
  ratingCount: number;
  page: number;
  pageSize: number;
  totalFiltered: number;
  ratingFilter: number | null;
  reviews: AdminReviewRow[];
};
