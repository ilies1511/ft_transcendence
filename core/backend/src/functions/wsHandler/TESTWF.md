# WS TEST Workflow for dms

1. Create a new **POST** request and enter the URL you want to test. In this example:
	- `http://localhost:3000/api/login`
	![Step 1](../../../../../docs/images/1.png)

2. Go to the **Body** tab, select **raw** and choose **JSON** format. Then enter the user's credentials.
	![Step 2](../../../../../docs/images/2.png)

3. Click **Send** and Copy the **cookie** from the response.
	![Step 3](../../../../../docs/images/3.png)

4. Create a new **WebSocket** request and enter the WebSocket endpoint. In this example:
	- `ws://localhost:3000/ws`
	![Step 5](../../../../../docs/images/5.png)

5. Go to the **Headers** section, add a new key `Cookie`, and paste the value you copied in step 4.
	![Step 6](../../../../../docs/images/4.png)

6. Click **Connect**.
	![Step 7](../../../../../docs/images/5.png)

7. If everything was done correctly, you should receive the following message:
	- `"Connected to ws://localhost:3000/ws"`
	![Step 8](../../../../../docs/images/6.png)

8. Repeat the same process for another user.

9. Now test the connection for example, by sending direct messages (DMs):
	![Step 10a](../../../../../docs/images/7.png)
	![Step 10b](../../../../../docs/images/8.png)
