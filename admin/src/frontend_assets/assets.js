// Only the assets actually used by the admin panel. (A previous version of
// this file imported 52 unused mock product images plus a large hardcoded
// `products` mock array that nothing in the app ever imported — pure dead
// weight bloating the bundle. Removed.)
import logo from './logo.png'
import bin_icon from './bin_icon.png'
import star_icon from './star_icon.png'
import upload_area from './upload_area.svg'

export const assets = {
    logo,
    bin_icon,
    star_icon,
    upload_area,
}
