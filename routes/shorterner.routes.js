import { Router } from "express"
const router=Router();
import { getShortenerPage,postURLShortener,redirectToShortLink,getShortnerEditPage,deleteShortCode,postShortenerEditPage} from "../controllers/postshorterner.controller.js";



router.get('/', getShortenerPage)

router.post('/',postURLShortener)

router.get("/:shortCode",redirectToShortLink)

router.route("/edit/:id").get(getShortnerEditPage).post(postShortenerEditPage);

router.route("/delete/:id").post(deleteShortCode)
//?default export
// export default router;

//Named exports

export const shortenerRoutes=router;
