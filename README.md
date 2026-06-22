# TLM_LLM_proxy_compatibility_script
车万女仆(Touhou Little Maid)用Ollama本地部署大语言模型对话生成失败的终极解决方案！

Ultimate solution for the failure of local deployment of dialogue generation in Touhou Little Maid LLM using Ollama!

原理：因为车万女仆模组的AI对话功能极其简陋，甚至不支持流式传输，导致任何以流式传输方式输入给车万女仆模组的任何数据包它都不能正确解析！

解决方案：我用nodejs做了一个代理脚本，作为一个中间人负责转发Ollama和车万女仆模组之间传输的数据，并修改数据包给每个给每个json里自动加上 stream=false(禁用流式传输)

还有另一个版本是在加上 stream=false(禁用流式传输) 的同时 再加一个 think=false(禁用thinking模式) 以加快对话生成速度。毕竟关了流式传输玩家不能实时看到每个token的输出，禁用thinking模式能极大加快对话生成速度！

如果这个脚本对您有帮助请帮我点点小星星，谢谢大家！！(*´∀`)~♥

Principle: Because the AI dialogue function of the Touhou Little Maid module is extremely simple and does not even support streaming transmission, any data packet input to the Touhou Little Maid module in streaming mode cannot be correctly parsed!

Solution: I created a proxy script using Node.js, which acts as an intermediary responsible for forwarding the data transmitted between Ollama and the Chewan Maid module, and modifying the data packets to automatically add stream=false to each JSON file (disabling streaming transmission)

There is another version that adds stream=false (disabling streaming) and think=false (disabling thinking mode) to speed up conversation generation. After all, players cannot see the real-time output of each token when streaming is turned off. Disabling the thinking mode can greatly accelerate the speed of dialogue generation!

If this script is helpful to you, please help me point a little star, thank you everyone!! (*´∀`)~ ♥
