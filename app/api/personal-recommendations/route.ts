const unavailable=()=>Response.json({configured:false,available:false,demo:true,error:'AI and private recommendations are disabled in this source demo.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){return unavailable()}
export async function POST(){return unavailable()}
