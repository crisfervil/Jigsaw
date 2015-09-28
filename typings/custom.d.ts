declare module ejs{
	function render(template:string, data):string;	
}
declare module "ejs"{
	export = ejs;	
}
