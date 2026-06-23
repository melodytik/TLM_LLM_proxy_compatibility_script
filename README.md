# TLM_LLM_proxy_compatibility_script
车万女仆(Touhou Little Maid)用Ollama本地部署大语言模型对话生成失败的终极解决方案！

Ultimate solution for the failure of local deployment of dialogue generation in Touhou Little Maid LLM using Ollama!

原因：因为车万女仆模组的AI对话功能极其简陋，甚至不支持流式传输，导致任何以流式传输方式输入给车万女仆模组的任何数据包它都不能正确解析！

解决方案：我用nodejs做了一个代理脚本，作为一个中间人负责转发Ollama和车万女仆模组之间传输的数据，并修改数据包给每个json里自动加上 stream=false(禁用流式传输)

同时我还加了 enable_thinking=false(禁用thinking模式)字段 以加快对话生成速度。毕竟关了流式传输玩家不能实时看到每个token的输出，禁用thinking模式能极大加快对话生成速度！

默认代理服务器监听端口11435如需要请自行修改！

如果这个脚本对您有帮助请帮我点点小星星，谢谢大家！！(*´∀`)~♥

Reason: The AI dialogue function of the Touhou Little Maid mod is extremely rudimentary, and it does not even support streaming transmission. As a result, it cannot correctly parse any data packets inputted to the Touhou Little Maid mod through streaming transmission!

Solution: I created a proxy script using Node.js, which acts as an intermediary responsible for forwarding the data transmitted between Ollama and the Che Wan maid module, and modifying the data packets to automatically add "stream=false" (disable streaming) to each JSON

At the same time, I also added the enable_thinking=false field (to disable the thinking mode) to speed up the generation of dialogues. After all, if streaming is turned off, players cannot see the output of each token in real time, and disabling the thinking mode can greatly speed up the generation of dialogues!

The default proxy server listens on port 11435. Please modify it yourself if necessary!

If this script is helpful to you, please help me point a little STAR, thank you everyone!! (*´∀`)~ ♥
