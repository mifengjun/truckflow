import {test,expect} from '@playwright/test';
test('客户修改资料并将真实输入带到确认页',async({page})=>{
 await page.goto('/prototype/portal/inquiry');
 await page.getByRole('textbox',{name:'完整收货地址',exact:true}).fill('Building 12, Receiving Dock B, 2200 International Logistics Boulevard, Dallas, TX 75201');
 await page.getByRole('button',{name:'下一步：填写货物'}).click();
 await page.getByRole('button',{name:'添加一种货物'}).click();
 await page.getByRole('textbox',{name:'品名 2',exact:true}).fill('办公桌配件');
 await page.getByRole('button',{name:'返回收发货'}).click();
 await expect(page.getByRole('textbox',{name:'完整收货地址',exact:true})).toHaveValue(/Building 12/);
 await page.getByRole('button',{name:'下一步：填写货物'}).click();
 await page.getByRole('button',{name:'获取承运商报价'}).click();
 await page.getByRole('link',{name:'选择报价'}).first().click();
 await expect(page.getByText('办公桌配件',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'确认提交订单'})).toBeDisabled();
});
