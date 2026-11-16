import fefcoCover from '../assets/images/catalog_fefco_corrugated_1794764676518.jpg';
import hardboxCover from '../assets/images/catalog_luxury_hardbox_1794764676452.jpg';
import mailerCover from '../assets/images/catalog_ecommerce_mailer_1794764677888.jpg';
import pharmaCover from '../assets/images/catalog_pharma_cosmetic_1794764676825.jpg';

const CATALOG_IMAGE_MAP: Record<string, string> = {
  '/src/assets/images/catalog_fefco_corrugated_1794764676518.jpg': fefcoCover,
  '/src/assets/images/catalog_luxury_hardbox_1794764676452.jpg': hardboxCover,
  '/src/assets/images/catalog_ecommerce_mailer_1794764677888.jpg': mailerCover,
  '/src/assets/images/catalog_pharma_cosmetic_1794764676825.jpg': pharmaCover,
  'cat-fefco-industrial': fefcoCover,
  'cat-luxury-hardbox': hardboxCover,
  'cat-ecommerce-mailer': mailerCover,
  'cat-ecma-pharma': pharmaCover,
};

export function resolveCatalogCoverImage(coverImage?: string, id?: string | number): string | undefined {
  if (coverImage && CATALOG_IMAGE_MAP[coverImage]) {
    return CATALOG_IMAGE_MAP[coverImage];
  }
  if (coverImage) {
    return coverImage;
  }
  if (id !== undefined && CATALOG_IMAGE_MAP[String(id)]) {
    return CATALOG_IMAGE_MAP[String(id)];
  }
  return undefined;
}
