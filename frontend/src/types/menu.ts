export type MenuOption = {
  id: string;
  name: string;
  description?: string;
  priceDeltaCents?: number;
  image?: string;
};

export type MenuCustomizationGroup = {
  id: string;
  name: string;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  allowRepeats?: boolean;
  dependsOn?: {
    groupId: string;
    optionId: string;
  };
  options: MenuOption[];
};

export type SelectedCustomization = {
  groupId: string;
  groupName?: string;
  optionId: string;
  optionName?: string;
  priceDelta?: number;
  quantity?: number;
};

export type PublicMenuItem = {
  id: number;
  category: string;
  subcategory?: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number | null;
  image: string;
  isSpicy: boolean;
  isPopular: boolean;
  isFeatured?: boolean;
  customizations?: MenuCustomizationGroup[];
};
